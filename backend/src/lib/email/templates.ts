import type { EmailMessage } from "./transport.js";

/**
 * Тексти листів — двома мовами, кожна написана рідною, а не перекладена (та сама домовленість, що
 * в промптах помічника: тон українською — половина цінності).
 *
 * Листи навмисно короткі й без маркетингу. Лист про пароль людина читає в тривозі й поспіху; усе,
 * що не є дією або терміном дії посилання, тут заважає. З тієї ж причини немає логотипів і картинок:
 * вони роблять службовий лист схожим на розсилку, а службовий лист має виглядати службовим.
 */
export type EmailLocale = "uk" | "en";

export const toEmailLocale = (v: string | null | undefined): EmailLocale =>
  v?.startsWith("uk") ? "uk" : "en";

/** Мінімальний HTML: жодних зовнішніх ресурсів, інлайнові стилі, читабельно навіть без CSS. */
const wrap = (lines: string[], action: { label: string; url: string }): string => {
  const p = (text: string) =>
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#111">${text}</p>`;
  return [
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px">`,
    ...lines.map(p),
    `<p style="margin:0 0 24px"><a href="${action.url}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#111;color:#fff;text-decoration:none;font-size:15px">${action.label}</a></p>`,
    // Дублюємо посилання текстом: кнопки в частині клієнтів не працюють, а вставити URL руками
    // людина може завжди.
    `<p style="margin:0;font-size:13px;line-height:1.6;color:#666;word-break:break-all">${action.url}</p>`,
    `</div>`,
  ].join("");
};

const build = (
  to: string,
  subject: string,
  lines: string[],
  action: { label: string; url: string },
): EmailMessage => ({
  to,
  subject,
  text: [...lines, "", action.url].join("\n\n"),
  html: wrap(lines, action),
});

/** Підтвердження адреси. TTL згадуємо явно — інакше протухле посилання виглядає як поломка. */
export const verifyEmailMessage = (
  to: string,
  url: string,
  locale: EmailLocale,
  hours: number,
): EmailMessage =>
  locale === "uk"
    ? build(
        to,
        "Підтвердь пошту — Tracker",
        [
          "Залишився один крок: підтвердь, що ця адреса твоя.",
          `Посилання дійсне ${hours} год. Якщо ти не реєструвався в Tracker — просто не відкривай його, більше листів не буде.`,
        ],
        { label: "Підтвердити пошту", url },
      )
    : build(
        to,
        "Confirm your email — Tracker",
        [
          "One step left: confirm this address is yours.",
          `The link works for ${hours} hours. If you didn't sign up for Tracker, just ignore this — there won't be more emails.`,
        ],
        { label: "Confirm email", url },
      );

/**
 * Скидання пароля.
 *
 * Окремо сказано, що без відкриття посилання пароль не змінюється: людина, яка отримала такий лист
 * несподівано, має розуміти, що її акаунт ще не чіпали, — і не панікувати.
 */
export const resetPasswordMessage = (
  to: string,
  url: string,
  locale: EmailLocale,
  hours: number,
): EmailMessage =>
  locale === "uk"
    ? build(
        to,
        "Відновлення пароля — Tracker",
        [
          "Хтось попросив скинути пароль до цього акаунта.",
          `Посилання дійсне ${hours} год і спрацює один раз. Якщо це був не ти — нічого робити не треба: доки посилання не відкрито, пароль лишається тим самим.`,
        ],
        { label: "Задати новий пароль", url },
      )
    : build(
        to,
        "Reset your password — Tracker",
        [
          "Someone asked to reset the password for this account.",
          `The link works for ${hours} hours and can be used once. If this wasn't you, there's nothing to do — until the link is opened, your password stays as it is.`,
        ],
        { label: "Set a new password", url },
      );

/**
 * Повідомлення про зміну пароля — надсилається ПІСЛЯ факту, і його не можна вимкнути.
 *
 * Це єдиний сигнал, за яким людина помітить чуже втручання: той, хто змінив пароль, доступу до
 * пошти може не мати. Тому лист без кнопки — тут нема безпечної дії, є попередження.
 */
export const passwordChangedMessage = (to: string, locale: EmailLocale): EmailMessage => {
  const lines =
    locale === "uk"
      ? [
          "Пароль до твого акаунта Tracker щойно змінено, і всі сесії завершено — доведеться увійти заново.",
          "Якщо це був не ти — відразу віднови пароль через «Забув пароль» на сторінці входу.",
        ]
      : [
          "The password for your Tracker account was just changed, and all sessions were signed out — you'll need to log in again.",
          "If this wasn't you, reset your password right away via \"Forgot password\" on the login page.",
        ];
  return {
    to,
    subject: locale === "uk" ? "Пароль змінено — Tracker" : "Password changed — Tracker",
    text: lines.join("\n\n"),
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px">${lines
      .map((l) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#111">${l}</p>`)
      .join("")}</div>`,
  };
};
