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
  | "logout";

interface AuditFields {
  userId?: string;
  email?: string;
  ip?: string;
  family?: string;
}

export const audit = (event: AuthAuditEvent, fields: AuditFields = {}): void => {
  console.log(
    JSON.stringify({
      kind: "audit",
      event,
      at: new Date().toISOString(),
      ...fields,
    }),
  );
};
