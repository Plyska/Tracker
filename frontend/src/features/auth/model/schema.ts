import { z } from "zod";

// message — це i18n-ключі (не user-facing текст); UI робить t(error.message).
// Ключі додаються в Блоці 4 (auth.validation.*) — en + uk.
const PASSWORD_MIN = 8;

// Zod 4: формат-валідація email — окрема схема z.email() (метод .email() застарів).
const email = z
  .string()
  .trim()
  .min(1, "auth.validation.emailRequired")
  .pipe(z.email("auth.validation.emailInvalid"));

export const loginSchema = z.object({
  email,
  // На вході лише непорожність; правило довжини — реєстраційне.
  password: z.string().min(1, "auth.validation.passwordRequired"),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "auth.validation.nameRequired").max(60),
    email,
    password: z.string().min(PASSWORD_MIN, "auth.validation.passwordMin"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "auth.validation.passwordMismatch",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
