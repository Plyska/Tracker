import { z } from "zod";

// ISO date-only 'YYYY-MM-DD' (інваріант контракту).
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be 'YYYY-MM-DD'");

export const entriesRangeSchema = z.object({
  from: isoDate,
  to: isoDate,
});

export const toggleEntrySchema = z.object({
  habitId: z.string().min(1),
  date: isoDate,
  done: z.boolean(),
});

export type EntriesRangeInput = z.infer<typeof entriesRangeSchema>;
export type ToggleEntryInput = z.infer<typeof toggleEntrySchema>;
