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

// Форма профілю (Settings → таб «Профіль»): наразі лише ім'я; email read-only.
export const profileSchema = z.object({
  name: z.string().trim().min(1, "auth.validation.nameRequired").max(60),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;

// ── Флоу з листами ────────────────────────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({ email });

// Токен приходить із URL, а не з форми — у схемі його немає: підставляє сторінка.
export const resetPasswordSchema = z
  .object({
    password: z.string().min(PASSWORD_MIN, "auth.validation.passwordMin"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "auth.validation.passwordMismatch",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "auth.validation.passwordRequired"),
    newPassword: z.string().min(PASSWORD_MIN, "auth.validation.passwordMin"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "auth.validation.passwordMismatch",
    path: ["confirmPassword"],
  })
  // Пароль, що «змінили» на той самий, — не зміна: людина вважатиме, що захистилась, а сесії
  // відкликано ні за що.
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "auth.validation.passwordSame",
    path: ["newPassword"],
  });

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
