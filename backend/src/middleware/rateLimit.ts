import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";
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

/**
 * Флоу з листами (забув пароль, надіслати підтвердження ще раз).
 *
 * Окремий лімітер, бо `authLimiter` тут не працює: у нього `skipSuccessfulRequests`, а ці
 * ендпоінти віддають 204 **завжди** — і успішно, і коли адреси не існує. Під тим лімітером
 * лічильник не зростав би ніколи, тобто ліміту не було б.
 *
 * Рахуємо всі запити: захищаємо і свою квоту на пошту, і чужу скриньку від засипання листами
 * «відновлення пароля», яких людина не просила.
 */
export const emailLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60_000,
  limit: 5,
});

/**
 * Введення коду підтвердження — ліміт PER-USER (ендпоінт за `requireAuth`, тож ключ є завжди).
 *
 * Окремий від `emailLimiter` навмисно: там спільний бюджет із «надіслати ще раз», і людина, яка
 * двічі помилилась цифрою, а потім попросила новий код, впиралась би в стелю, нічого не зробивши
 * підозрілого. Головний захист від перебору все одно не тут, а на самому коді
 * (`VERIFY_CODE_MAX_ATTEMPTS` у lib/emailTokens.ts) — цей лімітер лише проти скриптового флуду.
 *
 * Per-user, а не per-IP: за одним NAT сидить ціла квартира чи офіс, і сусідська помилка не має
 * блокувати чуже підтвердження.
 */
export const verifyCodeLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60_000,
  limit: 20,
  keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ""),
});

/**
 * AI-ендпоінти (ADR 0012): ліміт PER-USER, не per-IP — ключ = `req.userId` (ставить `requireAuth`,
 * тому монтувати ПІСЛЯ нього). Це стеля проти циклів/скриптів у хвилину; денна квота на LLM-виклики —
 * окремо в `AiUsage` (429 AI_QUOTA_EXCEEDED). Фолбек на IP — лише для типобезпеки (IPv6-safe helper).
 */
export const aiLimiter = rateLimit({
  ...base,
  windowMs: 60_000, // 1 хв
  limit: 30,
  keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ""),
});
