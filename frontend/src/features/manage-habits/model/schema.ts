import { z } from "zod";

export const habitFormSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    color: z.string(),
    icon: z.string().nullable(),
    // Частота: null = щоденна звичка; 1..6 = «N разів на тиждень» (ADR 0010).
    weeklyTarget: z.number().int().min(1).max(6).nullable(),
    // Часова навичка: null = не часова; >0 = ціль хвилин/тиждень (ADR 0011). Взаємовиключне з weeklyTarget.
    weeklyMinutesTarget: z.number().int().min(1).max(10080).nullable(),
  })
  .refine((v) => !(v.weeklyTarget != null && v.weeklyMinutesTarget != null), {
    message: "weeklyTarget and weeklyMinutesTarget are mutually exclusive",
    path: ["weeklyMinutesTarget"],
  });

export type HabitFormValues = z.infer<typeof habitFormSchema>;
