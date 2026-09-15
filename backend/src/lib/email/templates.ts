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

/**
 * Логотип Tellday у листі — плашка зі знаком + вордмарк, як у навбарі лендінгу
 * (`src/landing/sections/Nav.tsx`), намальований **таблицею**, а не картинкою.
 *
 * Це не винахідливість заради винахідливості: у пошті всі звичні шляхи для логотипа закриті.
 * SVG вирізає Gmail і не рендерить Outlook; `data:`-URI блокують Gmail, Outlook і Yahoo; а
 * хостований PNG близько половини людей бачить порожнім прямокутником, доки не натисне
 * «показати зображення» — тобто саме в службовому листі логотип найчастіше й не видно.
 *
 * Знак «колонка дня» — чиста геометрія, тож клітинки стають комірками таблиці. Не блокується
 * ніколи, не потребує хостингу, важить нуль байтів.
 *
 * **Пропорції взято з лендінгу й збережено**, лише масштаб більший (плашка 32 замість 28), бо
 * сітка з 7:4 не ділиться на цілі пікселі на менших розмірах, а дробові розміри комірок поштові
 * клієнти округлюють хто як:
 *
 * | | лендінг | лист |
 * |---|---|---|
 * | плашка | 28 | 32 |
 * | знак усередині | 20 (сітка 18.1) | сітка 21 (клітинка 5, зазор 3) |
 * | радіус | 8 (`rounded-md`) | 9 |
 * | відступ до назви | 8 (`gap-2`) | 9 |
 * | кегль назви | 18 (`text-lg`) | 21 |
 *
 * Синхронізувати руками — бекенд не імпортує фронтенд; при зміні знака поправити тут.
 */
const BADGE = "#6d28d9"; // --primary (violet-700), як `bg-primary` у BrandBadge
const ON_BADGE = "#ffffff"; // --primary-foreground: сьогоднішня колонка
const ON_BADGE_PAST = "#9360e3"; // той самий білий при 26% на плашці — opacity в пошті ненадійна

/**
 * Сітка 3×3 у плашці.
 *
 * `cellspacing` — HTML-атрибут, а не CSS: Outlook рендерить Word-ом і `border-spacing` ігнорує,
 * інакше клітинки злиплися б у суцільний прямокутник. `border-radius` він теж ігнорує — клітинки
 * і плашка стануть квадратними, знак лишиться впізнаваним.
 */
const markHtml = (): string => {
  const cell = (color: string) =>
    `<td width="5" height="5" style="width:5px;height:5px;background-color:${color};border-radius:1px;font-size:0;line-height:0">&nbsp;</td>`;
  const row = `<tr>${cell(ON_BADGE_PAST)}${cell(ON_BADGE_PAST)}${cell(ON_BADGE)}</tr>`;
  return `<table role="presentation" cellpadding="0" cellspacing="3" border="0" style="border-collapse:separate">${row.repeat(3)}</table>`;
};

/**
 * Шапка: плашка зі знаком + назва. Усе таблицями — єдине вирівнювання, яке тримають усі клієнти.
 * `align/valign` центрують знак у плашці без дробових відступів.
 */
const header = (): string =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px">` +
  `<tr>` +
  `<td width="32" height="32" align="center" valign="middle" style="width:32px;height:32px;background-color:${BADGE};border-radius:9px">${markHtml()}</td>` +
  `<td style="padding-left:9px;font-family:Manrope,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:21px;font-weight:800;letter-spacing:-0.42px;color:#111">Tellday</td>` +
  `</tr>` +
  `</table>`;

/** Спільна оболонка всіх листів: однакові поля, шрифт і шапка. */
const shell = (inner: string): string =>
  `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px">${header()}${inner}</div>`;

/** Абзац листа — один стиль на всі шаблони. */
const para = (text: string): string =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#111">${text}</p>`;

/**
 * Мінімальний HTML: жодних зовнішніх ресурсів, інлайнові стилі, читабельно навіть без CSS.
 *
 * Лише кнопка, без продубльованого URL під нею. Голий токенізований лінк на пів-екрана робить
 * службовий лист схожим на фішинг — саме там, де людина має вирішити, чи він справжній. Запасний
 * шлях при цьому не зникає: **текстова версія листа (`build`) URL зберігає**, і клієнти, які HTML
 * не показують, отримують саме її.
 */
const wrap = (lines: string[], action: { label: string; url: string }): string =>
  shell(
    lines.map(para).join("") +
      `<p style="margin:0"><a href="${action.url}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#111;color:#fff;text-decoration:none;font-size:15px">${action.label}</a></p>`,
  );

/**
 * Каркас для листа з кодом. `letter-spacing` і моноширинний шрифт — не прикраса: код переписують
 * очима, і саме вони роблять 0/O та 1/l різними. Виділяється мишею як звичайний текст.
 */
const wrapCode = (lines: string[], code: string): string =>
  shell(
    para(lines[0]!) +
      `<p style="margin:0 0 24px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#111">${code}</p>` +
      para(lines[1]!),
  );

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

/**
 * Підтвердження адреси — **код**, а не кнопка.
 *
 * Тому й шаблон інший за формою: код має бути найбільшим у листі й лишатись читабельним у
 * прев'ю сповіщення, де видно перші кілька слів. Тому він стоїть у першому рядку теми.
 *
 * TTL згадуємо явно — інакше протухлий код виглядає як поломка, а не як термін.
 */
export const verifyEmailMessage = (
  to: string,
  code: string,
  locale: EmailLocale,
  minutes: number,
): EmailMessage => {
  const [subject, lines]: [string, [string, string]] =
    locale === "uk"
      ? [
          `${code} — код підтвердження Tellday`,
          [
            "Залишився один крок: введи цей код у застосунку, щоб підтвердити пошту.",
            `Код дійсний ${minutes} хв. Якщо ти не реєструвався в Tellday — просто не вводь його, більше листів не буде.`,
          ],
        ]
      : [
          `${code} — your Tellday confirmation code`,
          [
            "One step left: enter this code in the app to confirm your email.",
            `The code works for ${minutes} minutes. If you didn't sign up for Tellday, just ignore this — there won't be more emails.`,
          ],
        ];
  return {
    to,
    subject,
    // Текстова версія: код на окремому рядку, щоб його можна було виділити подвійним кліком.
    text: [lines[0], code, lines[1]].join("\n\n"),
    html: wrapCode(lines, code),
  };
};

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
        "Відновлення пароля — Tellday",
        [
          "Хтось попросив скинути пароль до цього акаунта.",
          `Посилання дійсне ${hours === 1 ? "годину" : `${hours} год`} і спрацює один раз. Якщо це був не ти — нічого робити не треба: доки посилання не відкрито, пароль лишається тим самим.`,
        ],
        { label: "Задати новий пароль", url },
      )
    : build(
        to,
        "Reset your password — Tellday",
        [
          "Someone asked to reset the password for this account.",
          `The link works for ${hours === 1 ? "one hour" : `${hours} hours`} and can be used once. If this wasn't you, there's nothing to do — until the link is opened, your password stays as it is.`,
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
          "Пароль до твого акаунта Tellday щойно змінено, і всі сесії завершено — доведеться увійти заново.",
          "Якщо це був не ти — відразу віднови пароль через «Забув пароль» на сторінці входу.",
        ]
      : [
          "The password for your Tellday account was just changed, and all sessions were signed out — you'll need to log in again.",
          "If this wasn't you, reset your password right away via \"Forgot password\" on the login page.",
        ];
  return {
    to,
    subject: locale === "uk" ? "Пароль змінено — Tellday" : "Password changed — Tellday",
    text: lines.join("\n\n"),
    html: shell(lines.map(para).join("")),
  };
};
