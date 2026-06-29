import { z } from "zod";

// ISO date-only 'YYYY-MM-DD' (інваріант контракту).
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be 'YYYY-MM-DD'");

// Час доби 'HH:mm', локальний без TZ (ADR 0009). nullable — щоб PATCH міг знімати час.
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be 'HH:mm'")
  .nullable();

const habitId = z.string().min(1).nullable();

// Якщо задано обидва часи — кінець не раніше за початок (рядкове порівняння коректне для 'HH:mm').
const endNotBeforeStart = (v: {
  startTime?: string | null;
  endTime?: string | null;
}): boolean => !v.startTime || !v.endTime || v.endTime >= v.startTime;

const timeRangeError = {
  message: "End time must not be before start time",
  path: ["endTime"],
};

export const createTaskSchema = z
  .object({
    date: isoDate.nullable().optional(), // null/відсутня → «Загальна» картка (без дати)
    title: z.string().trim().min(1, "Title is required").max(200),
    startTime: time.optional(),
    endTime: time.optional(),
    habitId: habitId.optional(),
  })
  .refine(endNotBeforeStart, timeRangeError);

// PATCH — часткове оновлення; хоча б одне поле. `date` — перенести на день (null → у «Загальну»).
export const updateTaskSchema = z
  .object({
    date: isoDate.nullable(),
    title: z.string().trim().min(1).max(200),
    startTime: time,
    endTime: time,
    habitId,
    done: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  })
  .refine(endNotBeforeStart, timeRangeError);

export const taskParamsSchema = z.object({ id: z.string().min(1) });

// DELETE /tasks — очистити цілу картку: або конкретний день (?date=), або «Загальну» (?general=true).
export const clearTasksQuerySchema = z
  .object({
    date: isoDate.optional(),
    general: z.literal("true").optional(),
  })
  .refine((v) => (v.date ? !v.general : v.general === "true"), {
    message: "Provide either ?date=YYYY-MM-DD or ?general=true",
  });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ClearTasksInput = z.infer<typeof clearTasksQuerySchema>;
