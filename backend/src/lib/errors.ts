/**
 * Доменна помилка застосунку. Несе HTTP-статус + машинний `code`; тіло відповіді —
 * завжди `ApiError { message, code }` (формат контракту, docs/api-contract.md).
 * Кидаємо з сервісів/контролерів, ловить централізований error-handler.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Фабрики під коди контракту — щоб не плодити рядкові літерали по кодовій базі.
export const Errors = {
  validation: (message = "Validation failed") =>
    new AppError(400, "VALIDATION_ERROR", message),
  unauthenticated: (message = "Not authenticated") =>
    new AppError(401, "UNAUTHENTICATED", message),
  invalidCredentials: (message = "Invalid email or password") =>
    new AppError(401, "INVALID_CREDENTIALS", message),
  forbidden: (message = "Forbidden") => new AppError(403, "FORBIDDEN", message),
  emailTaken: (message = "Email already registered") =>
    new AppError(409, "EMAIL_TAKEN", message),
  habitNotFound: (message = "Habit not found") =>
    new AppError(404, "HABIT_NOT_FOUND", message),
  taskNotFound: (message = "Task not found") =>
    new AppError(404, "TASK_NOT_FOUND", message),
  tooManyRequests: (message = "Too many requests, please try again later") =>
    new AppError(429, "RATE_LIMITED", message),
  // AI-компаньйон (ADR 0012)
  aiDisabled: (message = "AI assistant is not enabled for this account") =>
    new AppError(403, "AI_DISABLED", message),
  aiQuotaExceeded: (message = "Daily AI quota exceeded, try again tomorrow") =>
    new AppError(429, "AI_QUOTA_EXCEEDED", message),
  aiUnavailable: (message = "AI assistant is temporarily unavailable") =>
    new AppError(503, "AI_UNAVAILABLE", message),
  // Не помилка провайдера, а стан даних: писати лист нема з чого (мало відміток/днів).
  aiNotEnoughData: (message = "Not enough tracked data to write a reflection yet") =>
    new AppError(422, "AI_NOT_ENOUGH_DATA", message),
  notImplemented: (message = "Not implemented") =>
    new AppError(501, "NOT_IMPLEMENTED", message),
  internal: (message = "Internal server error") =>
    new AppError(500, "INTERNAL", message),
};
