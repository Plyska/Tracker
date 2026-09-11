import type { Request, Response } from "express";
import { Errors } from "../../lib/errors.js";
import { signAccessToken } from "../../lib/jwt.js";
import { toUserDto } from "../../lib/mappers.js";
import {
  clearAuthCookies,
  REFRESH_COOKIE,
  setAccessCookie,
  setCsrfCookie,
  setRefreshCookie,
} from "../../lib/cookies.js";
import { generateCsrfToken } from "../../lib/csrf.js";
import { audit } from "../../lib/audit.js";
import {
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
} from "../../lib/refreshTokens.js";
import {
  changePassword,
  getUserById,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  updateUserProfile,
  verifyEmail,
} from "./auth.service.js";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
  VerifyEmailInput,
} from "./auth.schema.js";

/**
 * Cookie-флоу (Security-фаза, варіант B): access-JWT + CSRF-токен ставимо в cookie, у тілі
 * відповіді токени НЕ світяться (лише `{ user }`). refresh — httpOnly cookie scope `/auth`.
 */
const issueSession = async (res: Response, userId: string): Promise<void> => {
  const refresh = await issueRefreshToken(userId);
  setRefreshCookie(res, refresh.token, refresh.expiresAt);
  setAccessCookie(res, signAccessToken(userId));
  setCsrfCookie(res, generateCsrfToken());
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const user = await registerUser(req.body as RegisterInput);
  await issueSession(res, user.id);
  audit("register", { userId: user.id, email: user.email, ip: req.ip });
  // Лист навздогін, не блокуючи відповідь: реєстрація не має падати через збій пошти, а
  // `sendEmailSafely` усередині вже ковтає помилки провайдера й пише їх у лог.
  void sendVerificationEmail(user.id, user.email, user.emailVerifiedAt);
  res.status(201).json({ user: toUserDto(user) });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const input = req.body as LoginInput;
  let user;
  try {
    user = await loginUser(input);
  } catch (err) {
    audit("login.failure", { email: input.email, ip: req.ip });
    throw err;
  }
  await issueSession(res, user.id);
  audit("login.success", { userId: user.id, email: user.email, ip: req.ip });
  res.json({ user: toUserDto(user) });
};

/** Ротація: refresh-cookie → новий access + CSRF + ротований refresh-cookie. */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!raw) throw Errors.unauthenticated("Missing refresh token");

  const rotated = await rotateRefreshToken(raw);
  setRefreshCookie(res, rotated.token, rotated.expiresAt);
  setAccessCookie(res, signAccessToken(rotated.userId));
  setCsrfCookie(res, generateCsrfToken());
  audit("refresh", { userId: rotated.userId, ip: req.ip });
  res.status(204).end();
};

/** Logout: відкликаємо refresh у БД + чистимо всі auth-cookie. Idempotent. */
export const logout = async (req: Request, res: Response): Promise<void> => {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (raw) await revokeRefreshToken(raw);
  clearAuthCookies(res);
  audit("logout", { ip: req.ip });
  res.status(204).end();
};

export const me = async (req: Request, res: Response): Promise<void> => {
  const user = await getUserById(req.userId!);
  if (!user) throw Errors.unauthenticated("User no longer exists");
  res.json(toUserDto(user));
};

/** Оновлення профілю власника сесії (наразі ім'я). Повертає свіжий `UserDto`. */
export const updateMe = async (req: Request, res: Response): Promise<void> => {
  const user = await updateUserProfile(req.userId!, req.body as UpdateProfileInput);
  audit("profile.update", { userId: user.id, ip: req.ip });
  res.json(toUserDto(user));
};

/** OAuth відкладено (Google — окрема ітерація). Шов збережено: 501. */
export const oauth = async (_req: Request, _res: Response): Promise<void> => {
  throw Errors.notImplemented("OAuth sign-in is not yet available");
};

// ── Пошта: підтвердження адреси, скидання й зміна пароля ───────────────────────────────────

/**
 * POST /auth/forgot-password — **завжди 204**, є така адреса чи ні.
 *
 * Це не недбалість, а вимога: різна відповідь перетворила б форму на перевірку «чи зареєстрований
 * тут такий-то». З тієї ж причини не показуємо і збій надсилання (він іде в лог сервера).
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  await requestPasswordReset((req.body as ForgotPasswordInput).email);
  res.status(204).end();
};

/** POST /auth/reset-password — новий пароль за токеном із листа. Усі сесії відкликаються. */
export const resetPasswordHandler = async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body as ResetPasswordInput;
  await resetPassword(token, password);
  res.status(204).end();
};

/** POST /auth/verify-email — підтвердити адресу за токеном із листа. */
export const verifyEmailHandler = async (req: Request, res: Response): Promise<void> => {
  await verifyEmail((req.body as VerifyEmailInput).token);
  res.status(204).end();
};

/** POST /auth/verify-email/request — надіслати лист ще раз (для залогіненого). */
export const requestVerification = async (req: Request, res: Response): Promise<void> => {
  const user = await getUserById(req.userId!);
  if (user) await sendVerificationEmail(user.id, user.email, user.emailVerifiedAt);
  res.status(204).end();
};

/** POST /auth/change-password — зміна пароля залогіненим (потрібен поточний). Сесії відкликаються. */
export const changePasswordHandler = async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body as ChangePasswordInput;
  await changePassword(req.userId!, currentPassword, newPassword);
  // Свою сесію теж завершено — чистимо cookie, щоб клієнт не тримав мертвий стан «залогінений».
  clearAuthCookies(res);
  res.status(204).end();
};
