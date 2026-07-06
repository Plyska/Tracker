import { z } from "zod";

export const habitFormSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string(),
  icon: z.string().nullable(),
  // Частота: null = щоденна звичка; 1..6 = «N разів на тиждень» (ADR 0010).
  weeklyTarget: z.number().int().min(1).max(6).nullable(),
});

export type HabitFormValues = z.infer<typeof habitFormSchema>;
