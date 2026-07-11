import { z } from "zod";

// ISO date-only 'YYYY-MM-DD' (інваріант контракту).
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be 'YYYY-MM-DD'");

export const dailyLogRangeSchema = z.object({
  from: isoDate,
  to: isoDate,
});

// PUT /daily-logs — upsert денного настрою (userId+date — унікальний ключ).
// notes — HTML із rich-text-редактора щоденника (санітизується на клієнті при рендері);
// ліміт великий, бо це форматований текст, а не сирий рядок.
export const upsertDailyLogSchema = z.object({
  date: isoDate,
  mood: z.number().int().min(1).max(5),
  notes: z.string().max(20000).optional(),
});

export type DailyLogRangeInput = z.infer<typeof dailyLogRangeSchema>;
export type UpsertDailyLogInput = z.infer<typeof upsertDailyLogSchema>;
