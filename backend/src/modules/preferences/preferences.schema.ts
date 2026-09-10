import { z } from "zod";

/**
 * PATCH /me/preferences — часткове оновлення клієнтських налаштувань. Усі поля опційні
 * (`.partial()`); nullable-поля приймають `null` (скинути до дефолту). Стабільні набори —
 * enum; accent/locale — обмежені рядки (набір визначає фронт).
 */
export const updatePreferencesSchema = z
  .object({
    theme: z.enum(["light", "dark"]),
    accent: z.string().trim().min(1).max(32),
    locale: z.string().trim().min(2).max(10),
    tableLayout: z.enum(["columns", "rows"]),
    statsGoalPct: z.number().int().min(0).max(100).nullable(),
    hiddenStatWidgets: z.array(z.string().trim().min(1).max(64)).max(50),
    editorScale: z.number().min(0.8).max(1.5),
    // AI-компаньйон (ADR 0012). aiConsentAt клієнт НЕ передає — ставить сервер при першому enable.
    aiEnabled: z.boolean(),
    aiDiaryOptIn: z.boolean(),
    // Форма звертання (граматичний рід) — не стать: нам потрібен рід дієслова, не ідентичність.
    // Два значення, без «без роду»: заборонна інструкція моделлю не виконувалась (див. ai.prompts).
    aiAddressForm: z.enum(["masculine", "feminine"]),
  })
  .partial();

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
