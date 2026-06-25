import type { CookieOptions, Response } from "express";
import { env } from "../env.js";

/**
 * Cookie-флоу автентифікації (Security-фаза, варіант B). Усі токени — у cookie, JS на фронті їх
 * не читає (access/refresh — httpOnly), окрім CSRF-токена (double-submit, навмисно читабельний).
 *
 * SameSite/Secure залежать від середовища:
 *  - dev: фронт і бекенд на `localhost` (різні порти) — це *same-site*, тож `Lax` + `secure:false` (http).
 *  - prod: різні домени (Vercel ↔ Render тощо) — *cross-site*, тож `None` + `Secure` (інакше браузер
 *    не пошле cookie). За `SameSite=None` захист від CSRF дає саме double-submit-токен (нижче).
 */
export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";
export const CSRF_COOKIE = "csrf_token";

/** Спільна база: cross-site-готова в проді, зручна в dev. */
const baseCookie = (): CookieOptions => ({
  secure: env.isProd,
  sameSite: env.isProd ? "none" : "lax",
});

/**
 * Access-JWT — httpOnly, ходить на кожен запит (path `/`). Session-cookie (без maxAge):
 * строк дії визначає сам JWT (`exp` ~15хв) — прострочений → 401 → тихий refresh на фронті.
 */
export const setAccessCookie = (res: Response, token: string): void => {
  res.cookie(ACCESS_COOKIE, token, {
    ...baseCookie(),
    httpOnly: true,
    path: "/",
  });
};

/** Refresh — httpOnly, scope `/auth` (лише refresh/logout, не кожен запит). */
export const setRefreshCookie = (
  res: Response,
  token: string,
  expiresAt: Date,
): void => {
  res.cookie(REFRESH_COOKIE, token, {
    ...baseCookie(),
    httpOnly: true,
    path: "/auth",
    expires: expiresAt,
  });
};

/**
 * CSRF-токен — навмисно **не** httpOnly: фронт читає його з cookie й дублює у заголовок
 * `X-CSRF-Token`. `requireCsrf` звіряє cookie==заголовок (double-submit). Живе скільки й access.
 */
export const setCsrfCookie = (res: Response, token: string): void => {
  res.cookie(CSRF_COOKIE, token, {
    ...baseCookie(),
    httpOnly: false,
    path: "/",
  });
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookie(), httpOnly: true, path: "/" });
  res.clearCookie(REFRESH_COOKIE, {
    ...baseCookie(),
    httpOnly: true,
    path: "/auth",
  });
  res.clearCookie(CSRF_COOKIE, { ...baseCookie(), httpOnly: false, path: "/" });
};
