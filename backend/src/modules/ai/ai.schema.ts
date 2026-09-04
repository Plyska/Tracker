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

export type InsightsQuery = z.infer<typeof insightsQuerySchema>;
export type ReflectionBody = z.infer<typeof reflectionBodySchema>;
export type ReflectionsQuery = z.infer<typeof reflectionsQuerySchema>;
export type QuotaQuery = z.infer<typeof quotaQuerySchema>;
