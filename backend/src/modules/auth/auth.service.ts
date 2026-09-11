import type { User } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { env } from "../../env.js";
import { Errors } from "../../lib/errors.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { consumeEmailToken, issueEmailToken, TOKEN_TTL_HOURS } from "../../lib/emailTokens.js";
import { revokeAllUserSessions } from "../../lib/refreshTokens.js";
import { sendEmailSafely } from "../../lib/email/transport.js";
import {
  passwordChangedMessage,
  resetPasswordMessage,
  toEmailLocale,
  verifyEmailMessage,
  type EmailLocale,
} from "../../lib/email/templates.js";
import type { LoginInput, RegisterInput, UpdateProfileInput } from "./auth.schema.js";

/** Реєстрація: унікальний email, хеш пароля. Повертає створеного користувача. */
export const registerUser = async (input: RegisterInput): Promise<User> => {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) throw Errors.emailTaken();

  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
    },
  });
};

/** Логін: перевірка пароля. Однакова помилка для «нема юзера» і «невірний пароль» (no user enumeration). */
export const loginUser = async (input: LoginInput): Promise<User> => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // OAuth-only акаунт (passwordHash=null) теж не логіниться паролем.
  if (!user?.passwordHash) throw Errors.invalidCredentials();

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw Errors.invalidCredentials();

  return user;
};

export const getUserById = (id: string): Promise<User | null> =>
  prisma.user.findUnique({ where: { id } });

/** Оновлення профілю (ім'я + опц. аватар). Scope по id власника сесії. Повертає оновленого користувача. */
export const updateUserProfile = (
  id: string,
  input: UpdateProfileInput,
): Promise<User> =>
  prisma.user.update({
    where: { id },
    data: {
      name: input.name,
      // undefined → Prisma лишає поле незмінним; null → очищає аватар.
      ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
    },
  });

// ── Пошта: підтвердження адреси, скидання й зміна пароля ───────────────────────────────────

/** Мова листа = мова застосунку користувача; не задана — англійська (як `fallbackLng` на фронті). */
const localeOf = async (userId: string): Promise<EmailLocale> => {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { locale: true },
  });
  return toEmailLocale(prefs?.locale);
};

const linkTo = (path: string, token: string): string =>
  `${env.appUrl}${path}?token=${encodeURIComponent(token)}`;

/**
 * Надіслати лист із підтвердженням. Викликається при реєстрації і за запитом користувача.
 *
 * Уже підтверджену адресу мовчки пропускаємо: повторний лист нічого не додає, а на кнопку
 * «надіслати ще раз» натискають і за звичкою.
 */
export const sendVerificationEmail = async (
  userId: string,
  email: string,
  verifiedAt: Date | null,
): Promise<void> => {
  if (verifiedAt) return;
  const { token } = await issueEmailToken(userId, "verify");
  await sendEmailSafely(
    verifyEmailMessage(email, linkTo("/verify-email", token), await localeOf(userId), TOKEN_TTL_HOURS.verify),
  );
};

/** Підтвердити адресу за токеном. Ідемпотентно на рівні даних: токен одноразовий. */
export const verifyEmail = async (token: string): Promise<void> => {
  const userId = await consumeEmailToken(token, "verify");
  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
};

/**
 * Запит на скидання пароля.
 *
 * **Нічого не повертає й нічого не сигналізує** — ні існування акаунта, ні успіху надсилання.
 * Контролер віддає 204 завжди. Інакше форма «забув пароль» перетворюється на перевірку «чи
 * зареєстрований тут такий-то», а це готовий список для фішингу.
 *
 * OAuth-акаунт без пароля теж мовчки пропускаємо: скидати нічого, а відповідь має бути тією самою.
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!user?.passwordHash) return;

  const { token } = await issueEmailToken(user.id, "reset");
  await sendEmailSafely(
    resetPasswordMessage(user.email, linkTo("/reset-password", token), await localeOf(user.id), TOKEN_TTL_HOURS.reset),
  );
};

/**
 * Скидання пароля за токеном із листа.
 *
 * Порядок важливий: спершу **спожити** токен (атомарно, одноразово), потім міняти пароль. При
 * зворотному порядку збій між кроками лишив би живе посилання при вже зміненому паролі.
 *
 * Сесії відкликаємо всі: людина скидає пароль саме тоді, коли підозрює чужий доступ.
 */
export const resetPassword = async (token: string, password: string): Promise<void> => {
  const userId = await consumeEmailToken(token, "reset");
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(password),
      // Лист дійшов і посилання відкрито — адреса робоча, тож підтверджуємо заразом.
      // Окремий лист про підтвердження після цього був би зайвим клопотом.
      emailVerifiedAt: new Date(),
    },
    select: { id: true, email: true },
  });
  await revokeAllUserSessions(user.id);
  await sendEmailSafely(passwordChangedMessage(user.email, await localeOf(user.id)));
};

/**
 * Зміна пароля залогіненим. Поточний пароль питаємо обовʼязково: без цього будь-хто, хто на
 * хвилину дістався до відкритої вкладки, змінює пароль і забирає акаунт назовсім.
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!user?.passwordHash) throw Errors.invalidCredentials();
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw Errors.invalidCredentials("Current password is incorrect");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  await revokeAllUserSessions(userId);
  await sendEmailSafely(passwordChangedMessage(user.email, await localeOf(userId)));
};
