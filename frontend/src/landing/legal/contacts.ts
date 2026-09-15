/**
 * Реквізити, що зустрічаються в обох документах. Одне місце — щоб зміна юрособи чи адреси не
 * перетворювалась на пошук по текстах двома мовами.
 *
 * Контролер даних — ФОП; назва по мовах, бо англійський текст не має транслітерувати «ФОП», а
 * пояснити форму (sole proprietor).
 *
 * Адреса одна: GDPR вимагає контактних даних контролера, а не окремої скриньки для приватності.
 * Скриньки на домені може не існувати — Porkbun безкоштовно пересилає `*@tellday.app` на будь-яку
 * пошту (Domain Management → Email Forwarding). Але адреса має працювати ДО публікації.
 */
export const CONTACTS = {
  controller: {
    en: "Andrii Plyska, sole proprietor",
    uk: "ФОП Плиска Андрій Васильович",
  },
  supportEmail: "support@tellday.app",
} as const;

export const UPDATED = { en: "16 September 2026", uk: "16 вересня 2026" } as const;

/** Посилання на адресу в інлайн-розмітці документа. */
export const mail = (addr: string): string => `[${addr}](mailto:${addr})`;
