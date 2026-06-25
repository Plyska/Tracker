import { randomBytes, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { Errors } from "./errors.js";
import { CSRF_COOKIE } from "./cookies.js";

/**
 * CSRF-захист (double-submit cookie) для cookie-флоу автентифікації (Security-фаза, варіант B).
 * Бо access-cookie шлеться браузером автоматично (особливо за `SameSite=None` у проді), мутації
 * захищаємо токеном, який атакувальник із чужого origin прочитати/підставити не може:
 *  - сервер кладе випадковий токен у читабельний cookie `csrf_token` (див. setCsrfCookie);
 *  - фронт читає його з cookie й дублює у заголовок `X-CSRF-Token` на кожній мутації;
 *  - тут звіряємо cookie == заголовок. Збіг можливий лише для коду з нашого origin.
 */
export const CSRF_HEADER = "x-csrf-token";

export const generateCsrfToken = (): string => randomBytes(32).toString("hex");

/** Безпечне порівняння рядків (constant-time), стійке до timing-атак. */
const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

// Лише небезпечні (мутуючі) методи; GET/HEAD/OPTIONS не змінюють стан → пропускаємо.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Вимагає валідний double-submit CSRF-токен на мутаціях. Монтувати ПІСЛЯ cookieParser і
 * на захищених роутерах (habits/entries/logout). Bootstrap-роути (login/register/refresh)
 * звільнені: вони не діють від імені вже автентифікованої ambient-сесії.
 */
export const requireCsrf: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }
  const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const headerToken = req.get(CSRF_HEADER);
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    throw Errors.forbidden("Invalid CSRF token");
  }
  next();
};
