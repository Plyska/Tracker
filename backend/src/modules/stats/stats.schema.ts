import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be 'YYYY-MM-DD'");

// GET /stats?from&to&habitId — агрегації за діапазоном; habitId опційний (фокус на одній звичці).
export const statsQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
  habitId: z.string().min(1).optional(),
});

export type StatsQueryInput = z.infer<typeof statsQuerySchema>;
