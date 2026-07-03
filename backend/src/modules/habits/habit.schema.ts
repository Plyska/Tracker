import { z } from "zod";

// Колір — hex-токен рядка (фронт шле значення палітри). icon — lucide-назва або null.
const color = z.string().trim().min(1).max(32);
const icon = z.string().trim().min(1).max(64).nullable();

export const createHabitSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  color,
  icon: icon.optional(),
});

// PATCH — часткове оновлення; хоча б одне поле.
// Архів/видалення — окремі ендпоінти (DELETE = у кошик, POST /:id/restore = назад), не через PATCH.
export const updateHabitSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    color,
    icon,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });

export const habitParamsSchema = z.object({ id: z.string().min(1) });

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
