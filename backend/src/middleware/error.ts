import type { ErrorRequestHandler, RequestHandler } from "express";
import * as Sentry from "@sentry/node";
import { AppError } from "../lib/errors.js";
import { env } from "../env.js";

// 404 для невідомих маршрутів — у форматі ApiError.
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ code: "NOT_FOUND", message: "Route not found" });
};

/**
 * Централізований error-handler. Тіло будь-якої помилки — завжди `ApiError { message, code }`.
 * AppError → свій статус/код. Решта (неочікувані) → 500 без leak деталей у проді.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ code: err.code, message: err.message });
    return;
  }

  // body-parser / http-errors несуть числовий status (напр. невалідний JSON → 400).
  // Мапимо клієнтські 4xx на їхній статус, а не в 500.
  const status = (err as { status?: number; statusCode?: number })?.status ??
    (err as { statusCode?: number })?.statusCode;
  if (typeof status === "number" && status >= 400 && status < 500) {
    const malformed = (err as { type?: string })?.type === "entity.parse.failed";
    res.status(status).json({
      code: malformed ? "MALFORMED_JSON" : "BAD_REQUEST",
      message: malformed ? "Malformed JSON body" : (err as Error).message,
    });
    return;
  }

  /**
   * Сюди доходить лише НЕОЧІКУВАНЕ: усе, що є `AppError` або клієнтським 4xx, уже повернулось вище.
   *
   * Тому саме тут — єдина точка відправки в Sentry, і рішення «це інцидент» ухвалюється рівно там,
   * де воно вже ухвалене для логу. Альтернатива — `Sentry.setupExpressErrorHandler(app)` — ловила б
   * ще й `AppError`: невдалі логіни, 403 CSRF, 404 «навички немає». Це нормальна робота продукту,
   * і вона з'їла б безкоштовну квоту за тиждень, поховавши справжні помилки в шумі.
   *
   * Контекст додаємо руками й мінімальний: тіла, cookie й заголовки вимкнені в `instrument.ts`
   * навмисно, тож автоматичний збір нічого корисного все одно не дав би. Маршрут (`req.route`),
   * а не повний URL — в останньому бувають id та токени з листів.
   */
  Sentry.captureException(err, {
    tags: { method: req.method },
    extra: { route: (req.route as { path?: string } | undefined)?.path ?? req.baseUrl },
  });

  // eslint-disable-next-line no-console
  console.error("Unhandled error:", err);
  res.status(500).json({
    code: "INTERNAL",
    message: env.isProd ? "Internal server error" : String((err as Error)?.message ?? err),
  });
};
