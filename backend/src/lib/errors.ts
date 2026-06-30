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
  notImplemented: (message = "Not implemented") =>
    new AppError(501, "NOT_IMPLEMENTED", message),
  internal: (message = "Internal server error") =>
    new AppError(500, "INTERNAL", message),
};
