import { z } from "zod";

// 'HH:mm' або порожньо (поле необов'язкове). Порожній рядок ⇒ задача без часу (список справ).
const timeField = z
  .string()
  .regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, "tasks.form.timeInvalid");

export const taskFormSchema = z
  .object({
    // '' = без дати («Загальна» картка); інакше — ISO 'YYYY-MM-DD'.
    date: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/),
    title: z.string().trim().min(1, "tasks.form.titleRequired").max(200),
    startTime: timeField,
    endTime: timeField,
    habitId: z.string(), // '' = без навички
  })
  .refine((v) => !v.startTime || !v.endTime || v.endTime >= v.startTime, {
    message: "tasks.form.timeRange",
    path: ["endTime"],
  });

export type TaskFormValues = z.infer<typeof taskFormSchema>;
