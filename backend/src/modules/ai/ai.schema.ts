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

export type InsightsQuery = z.infer<typeof insightsQuerySchema>;
