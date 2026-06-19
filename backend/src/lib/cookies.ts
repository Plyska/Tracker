import type { Response } from "express";
import { env } from "../env.js";

/**
 * Refresh-токен живе у httpOnly cookie (JS на фронті його не читає → менший ризик XSS-крадіжки).
 * SameSite=Lax дає baseline-захист від CSRF (cross-site POST/fetch не несе cookie).
 * Scope шляхом `/auth` — cookie ходить лише на refresh/logout, не на кожен запит.
 */
export const REFRESH_COOKIE = "refresh_token";
const COOKIE_PATH = "/auth";

export const setRefreshCookie = (
  res: Response,
  token: string,
  expiresAt: Date,
): void => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd, // HTTPS-only у проді; у dev (http://localhost) — false
    sameSite: "lax",
    path: COOKIE_PATH,
    expires: expiresAt,
  });
};

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: COOKIE_PATH,
  });
};
