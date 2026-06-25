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
import {
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
} from "../../lib/refreshTokens.js";
import { getUserById, loginUser, registerUser } from "./auth.service.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";

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
  res.status(201).json({ user: toUserDto(user) });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const user = await loginUser(req.body as LoginInput);
  await issueSession(res, user.id);
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
  res.status(204).end();
};

/** Logout: відкликаємо refresh у БД + чистимо всі auth-cookie. Idempotent. */
export const logout = async (req: Request, res: Response): Promise<void> => {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (raw) await revokeRefreshToken(raw);
  clearAuthCookies(res);
  res.status(204).end();
};

export const me = async (req: Request, res: Response): Promise<void> => {
  const user = await getUserById(req.userId!);
  if (!user) throw Errors.unauthenticated("User no longer exists");
  res.json(toUserDto(user));
};

/** OAuth відкладено (Google — окрема ітерація). Шов збережено: 501. */
export const oauth = async (_req: Request, _res: Response): Promise<void> => {
  throw Errors.notImplemented("OAuth sign-in is not yet available");
};
