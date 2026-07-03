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

// Аватар — base64 data-URL (клієнт стискає до ~256px). `null` очищає. Межа довжини (~750KB
// рядка) — груба стеля проти роздування БД; тонше стиснення робить клієнт. Формат: image data-URL.
const avatarDataUrl = z
  .string()
  .max(750_000, "Avatar is too large")
  .regex(/^data:image\/(png|jpe?g|webp);base64,/, "Invalid avatar format");

// Оновлення профілю: ім'я + (опц.) аватар. Email/пароль — окремі флоу. Узгоджено з фронтом.
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  // undefined — не чіпати; null — прибрати; data-URL — встановити.
  avatarUrl: avatarDataUrl.nullable().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
