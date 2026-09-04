/**
 * Audit-логи авторизації (Security-фаза). Структуровані події безпеки у stdout як JSON-рядки —
 * щоб прод-агрегатор (Datadog/Logtail/CloudWatch) їх парсив і за ними можна було будувати алерти
 * (сплеск `login.failure`, `refresh.reuse_detected` тощо).
 *
 * Свідомо НЕ пишемо в БД: окрема таблиця/ротація — це вже завдання інфри логування.
 * Ніколи не логуємо паролі/токени — лише ідентифікатори та результат.
 */
export type AuthAuditEvent =
  | "login.success"
  | "login.failure"
  | "register"
  | "refresh"
  | "refresh.reuse_detected"
  | "logout"
  | "profile.update";

/**
 * AI-компаньйон (ADR 0012): факт виклику + вартість (модель, токени), НІКОЛИ не контент —
 * запити містять щоденник/настрій (план §8: нічого зі щоденника в логи).
 */
export type AiAuditEvent =
  | "ai.reflection" // згенеровано лист (або віддано з кешу — cached:true)
  | "ai.insights"
  | "ai.checkin"
  | "ai.chat"
  | "ai.data.export"
  | "ai.data.delete";

export type AuditEvent = AuthAuditEvent | AiAuditEvent;

interface AuditFields {
  userId?: string;
  email?: string;
  ip?: string;
  family?: string;
  // AI
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  period?: string;
  cached?: boolean;
}

export const audit = (event: AuditEvent, fields: AuditFields = {}): void => {
  console.log(
    JSON.stringify({
      kind: "audit",
      event,
      at: new Date().toISOString(),
      ...fields,
    }),
  );
};
