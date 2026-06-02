import { z } from "zod";

export const habitFormSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string(),
  icon: z.string().nullable(),
});

export type HabitFormValues = z.infer<typeof habitFormSchema>;
