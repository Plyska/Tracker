import type { Request, Response } from "express";
import { Errors } from "../../lib/errors.js";
import { signAccessToken } from "../../lib/jwt.js";
import { toUserDto } from "../../lib/mappers.js";
import {
  clearRefreshCookie,
  REFRESH_COOKIE,
  setRefreshCookie,
} from "../../lib/cookies.js";
import {
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
} from "../../lib/refreshTokens.js";
import {
  getUserById,
  loginUser,
  registerUser,
} from "./auth.service.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";

/**
 * AuthResponse контракту: `{ user, accessToken }`. Refresh-токен — у httpOnly cookie
 * (видається/ротується/чиститься тут, у тілі відповіді не світиться).
 */
const issueSession = async (
  res: Response,
  userId: string,
): Promise<string> => {
  const refresh = await issueRefreshToken(userId);
  setRefreshCookie(res, refresh.token, refresh.expiresAt);
  return signAccessToken(userId);
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const user = await registerUser(req.body as RegisterInput);
  const accessToken = await issueSession(res, user.id);
  res.status(201).json({ user: toUserDto(user), accessToken });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const user = await loginUser(req.body as LoginInput);
  const accessToken = await issueSession(res, user.id);
  res.json({ user: toUserDto(user), accessToken });
};

/** Ротація: cookie → новий access + ротований refresh-cookie. */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!raw) throw Errors.unauthenticated("Missing refresh token");

  const rotated = await rotateRefreshToken(raw);
  setRefreshCookie(res, rotated.token, rotated.expiresAt);
  res.json({ accessToken: signAccessToken(rotated.userId) });
};

/** Logout: відкликаємо refresh у БД + чистимо cookie. Idempotent. */
export const logout = async (req: Request, res: Response): Promise<void> => {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (raw) await revokeRefreshToken(raw);
  clearRefreshCookie(res);
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
