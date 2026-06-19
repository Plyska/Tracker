import { z } from "zod";

// Узгоджено з фронтовою zod-схемою (features/auth): email + пароль ≥ 8, ім'я обов'язкове при реєстрації.
const email = z.string().trim().toLowerCase().email("Invalid email");
const password = z.string().min(8, "Password must be at least 8 characters").max(128);

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
