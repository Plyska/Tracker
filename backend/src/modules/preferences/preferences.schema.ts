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
  })
  .partial();

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
