import { z } from "zod";

// Узгоджено з фронтовою zod-схемою (features/auth): email + пароль ≥ 8, ім'я обов'язкове при реєстрації.
const email = z.string().trim().toLowerCase().email("Invalid email");
const password = z.string().min(8, "Password must be at least 8 characters").max(128);

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email,
  password,
  // Мова інтерфейсу в момент реєстрації. Опційна — клієнт може її не передати (інший клієнт,
  // curl), тоді лишається дефолт `en`.
  //
  // Потрібна саме тут, бо перший лист продукту — код підтвердження — надсилається ДО того, як
  // з'явиться рядок `UserPreferences`: він створюється лише коли фронт уперше збереже
  // налаштування. Без цього поля людина, яка щойно заповнила українську форму, отримувала б
  // англійський лист. Обмеження як у `updatePreferencesSchema`: набір мов визначає фронт.
  locale: z.string().trim().min(2).max(10).optional(),
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

// ── Пошта: підтвердження, скидання й зміна пароля ──────────────────────────────────────────

// Токен приходить із URL листа; довжину не перевіряємо строго — форма може змінитись, а невірний
// токен усе одно відсіється в `consumeEmailToken` тією самою помилкою, що й підроблений.
const emailToken = z.string().trim().min(1, "Token is required").max(512);

export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: emailToken, password });
// Код із листа — рівно 6 цифр. На відміну від токена, тут форма ФІКСОВАНА, тож перевіряємо
// строго: це відсікає перебір рядками довільної довжини ще до звернення до БД.
export const verifyEmailSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Code must be 6 digits"),
});
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: password,
});

// Видалення акаунта — з паролем. Це найнезворотніша дія в продукті, і чужа рука на відкритій
// вкладці не має її вчинити: пароль — те, чого в неї немає.
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
