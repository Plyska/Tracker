import type { ErrorRequestHandler, RequestHandler } from "express";
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
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ code: err.code, message: err.message });
    return;
  }

  // eslint-disable-next-line no-console
  console.error("Unhandled error:", err);
  res.status(500).json({
    code: "INTERNAL",
    message: env.isProd ? "Internal server error" : String((err as Error)?.message ?? err),
  });
};
