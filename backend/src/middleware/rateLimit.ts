import rateLimit, { type Options } from "express-rate-limit";
import { Errors } from "../lib/errors.js";

/**
 * Rate limiting (Security-фаза). Захист від брутфорсу паролів і загального флуду.
 * При перевищенні віддаємо `429 RATE_LIMITED` у форматі `ApiError` (через error-handler).
 *
 * IP-адресу за reverse-proxy (прод: Render/Railway) бере з `X-Forwarded-For` — потребує
 * `app.set("trust proxy", …)` (виставляється в app.ts у проді).
 */
const handler: Options["handler"] = (_req, _res, next) => {
  next(Errors.tooManyRequests());
};

const base = {
  standardHeaders: true, // RateLimit-* заголовки (стандарт IETF)
  legacyHeaders: false, // без застарілих X-RateLimit-*
  handler,
} satisfies Partial<Options>;

/** Глобальний ліміт на всі запити — стеля проти скрейпу/флуду (щедрий для звичайного UX). */
export const apiLimiter = rateLimit({
  ...base,
  windowMs: 60_000, // 1 хв
  limit: 300, // ~5 req/s на IP
});

/**
 * Строгий ліміт на чутливі auth-дії (login/register/refresh) — проти брутфорсу.
 * `skipSuccessfulRequests` — рахуємо лише НЕвдалі спроби: легітимний вхід/refresh не «з'їдає» ліміт,
 * а перебір паролів швидко впирається в стелю.
 */
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60_000, // 15 хв
  limit: 10,
  skipSuccessfulRequests: true,
});
