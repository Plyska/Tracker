import { z } from "zod";

// ISO date-only 'YYYY-MM-DD' (інваріант контракту). Клієнт шле свою локальну «сьогодні» — так
// уникаємо TZ-дрейфу від серверного UTC (той самий підхід, що `to` у /stats).
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be 'YYYY-MM-DD'");

/** GET /ai/insights?today= — підказки-патерни (без LLM). */
export const insightsQuerySchema = z.object({
  today: isoDate,
});

/**
 * POST /ai/reflection — лист-підсумок. `today` від клієнта (локальна дата, без TZ-дрейфу);
 * `locale` визначає мову листа (кешується разом із ним).
 */
export const reflectionBodySchema = z.object({
  period: z.enum(["week", "month"]).default("week"),
  today: isoDate,
  locale: z.enum(["en", "uk"]).default("uk"),
});

/** GET /ai/reflections?period= — історія листів (кеш = архів). */
export const reflectionsQuerySchema = z.object({
  period: z.enum(["week", "month"]).default("week"),
});

/** GET /ai/quota?today= — залишок денної квоти. */
export const quotaQuerySchema = z.object({
  today: isoDate,
});

/**
 * POST /ai/checkin — розбір природної мови на ДІЇ (фаза B1, ADR 0012 п. 7).
 * `text` — те, що людина сказала/надиктувала; `intent` лише підказує намір (плейсхолдер за часом
 * доби), розпізнає все одно модель.
 */
export const checkinBodySchema = z.object({
  text: z.string().trim().min(1, "Text is required").max(2000),
  today: isoDate,
  locale: z.enum(["en", "uk"]).default("uk"),
  intent: z.enum(["auto", "log", "plan"]).default("auto"),
});

export type CheckinBody = z.infer<typeof checkinBodySchema>;

/**
 * POST /ai/chat — розмова (фаза B2). Історія НЕ зберігається на сервері (ADR 0012), тож клієнт
 * шле її щоразу. `seed` — звідки прийшли (лист / підказка / чек-ін), щоб перший хід не був
 * розмовою з порожнечею.
 *
 * Межі — не формальність: історія входить у кожен запит, тож без стелі вартість зростає
 * квадратично від довжини розмови.
 */
export const chatBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        text: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(24)
    .refine((m) => m[m.length - 1]?.role === "user", {
      message: "Last message must be from the user",
    }),
  today: isoDate,
  locale: z.enum(["en", "uk"]).default("uk"),
  seed: z
    .object({
      type: z.enum(["reflection", "insight", "checkin"]),
      key: z.string().max(120),
    })
    .optional(),
});

export type ChatBody = z.infer<typeof chatBodySchema>;

export type InsightsQuery = z.infer<typeof insightsQuerySchema>;
export type ReflectionBody = z.infer<typeof reflectionBodySchema>;
export type ReflectionsQuery = z.infer<typeof reflectionsQuerySchema>;
export type QuotaQuery = z.infer<typeof quotaQuerySchema>;
