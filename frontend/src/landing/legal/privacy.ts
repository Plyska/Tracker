import type { Locale } from "../i18n";
import { CONTACTS, UPDATED, mail } from "./contacts";
import type { LegalDoc } from "./types";

/**
 * Політика конфіденційності — описує те, що продукт **справді робить** із даними, і нічого понад те.
 *
 * Кожне твердження тут звірене з кодом на момент дати оновлення: перелік даних — зі схеми Prisma,
 * процесори — з env і транспортів, cookie — з `lib/cookies.ts`, поведінка асистента — з
 * `modules/ai`. Якщо міняється код — міняється й цей файл, разом із датою. Політика, що описує
 * бажаний продукт замість реального, гірша за відсутню: вона дає обіцянки, за які відповідати
 * доведеться.
 *
 * Дві мови написані кожна рідною, не перекладом. Тон — «ви» (юридичний документ), хоча продукт
 * звертається на «ти»: тут людина читає, що з нею робитимуть, і фамільярність зменшує довіру.
 */
const S = CONTACTS.supportEmail;

const en: LegalDoc = {
  title: "Privacy Policy",
  lead:
    "This page explains what Tellday collects, why, where it goes, and what you can do about it. It describes what the product actually does today — not what a template says a product usually does.",
  updated: UPDATED.en,
  sections: [
    {
      id: "who",
      heading: "Who is responsible",
      body: [
        `Tellday is operated by **${CONTACTS.controller.en}**, registered in Ukraine — the "controller" of your data in the sense of the GDPR and Ukrainian data protection law. For anything about your data, write to ${mail(S)}. We reply within 30 days, usually much sooner.`,
      ],
    },
    {
      id: "data",
      heading: "What we collect",
      body: [
        "Only what the product needs to work. There is no advertising profile, no analytics tracking and no data bought from or sold to anyone.",
        {
          table: {
            head: ["Category", "What exactly", "Why"],
            rows: [
              [
                "Account",
                "Email address, name, an optional avatar (stored as an image in our database), and a hash of your password — never the password itself.",
                "To create the account, sign you in and send the emails that keep it safe.",
              ],
              [
                "Your records",
                "Habits and their targets; daily check marks and time spent; mood (1–5) and diary notes; day-plan tasks.",
                "This is the product: your grid, your statistics, your diary.",
              ],
              [
                "Preferences",
                "Language, theme, accent colour, table layout, hidden statistics widgets, assistant settings (on/off, diary access, form of address) and the moment you gave consent.",
                "So the app looks the same on every device and remembers your choices.",
              ],
              [
                "Assistant output",
                "Letters and insights the assistant wrote for you, and a per-day count of requests.",
                "To show them to you again, and to apply the daily quota.",
              ],
              [
                "Security log",
                "Email address and IP address at sign-up, sign-in and session refresh.",
                "To notice break-in attempts and abuse.",
              ],
              [
                "Technical",
                "Three cookies and a few browser-storage keys — see “Cookies and browser storage”.",
                "To keep you signed in and remember display settings.",
              ],
            ],
          },
        },
        "We do not collect your location, contacts, device identifiers, or anything about you from other websites.",
      ],
    },
    {
      id: "why",
      heading: "Why we process it, and on what legal basis",
      body: [
        {
          list: [
            "**To provide the service you asked for** — performance of a contract (GDPR art. 6(1)(b)). This covers your account, your records, your preferences, and the emails needed to run them: the verification code, password reset links, and notices that your password was changed or your account deleted.",
            "**To keep the service safe** — our legitimate interest (art. 6(1)(f)). This covers the security log, rate limiting, and the security emails you cannot switch off.",
            "**To run the AI assistant** — your consent (art. 6(1)(a)), given separately inside the app and revocable at any time. Letting the assistant read your diary needs a second, separate consent.",
          ],
        },
      ],
    },
    {
      id: "assistant",
      heading: "The AI assistant",
      body: [
        "The assistant is **off until you switch it on**. When you do, the relevant data goes to **Groq, Inc. (USA)**, which runs the language model that writes the replies.",
        "**What it sees:** the names of your habits, your check marks and time, your mood, and statistics derived from them. **Your diary text is sent only if you separately allow “Let the assistant read the diary.”** Without that permission, notes never leave our database.",
        "**Your data is not used to train models.** Our provider's terms prohibit training on customer data. Requests are processed to produce a reply; we do not keep chat history. The assistant's letters and insights are stored so you can reread them — and you can delete them at any time.",
        "**Safety screening.** The same text is also checked, in a separate call to the same provider, for signs that you might be in crisis, so the assistant can answer with care and show support resources. This is not a diagnosis, nobody at Tellday reads it, and it involves no data the assistant was not already given.",
        "**Switching off.** Settings → Assistant. “Delete assistant data” removes every letter and insight immediately; export is available in the same place.",
      ],
    },
    {
      id: "processors",
      heading: "Where your data lives, and who helps us process it",
      body: [
        "We do not run our own servers. These companies process data strictly on our instructions, under data-processing agreements, and only for the role listed:",
        {
          table: {
            head: ["Provider", "Role", "Location"],
            rows: [
              ["Neon, Inc.", "The database — all your records.", "Frankfurt, Germany (EU)"],
              ["Vercel, Inc.", "Hosting and running the application.", "Compute in the EU; Vercel is a US company"],
              ["Resend, Inc.", "Sending transactional emails.", "Ireland (EU)"],
              ["Groq, Inc.", "The language model behind the assistant — only if you enable it.", "USA"],
              [
                "Upstash, Inc.",
                "Short-lived request counters for rate limiting: an IP address or user ID, kept for 15 minutes.",
                "EU",
              ],
              [
                "Sentry (Functional Software, Inc.)",
                "Error monitoring: when something breaks, it receives the error, the file and line it happened in, and the route — deliberately without request bodies, cookies, headers or your identity.",
                "Frankfurt, Germany (EU)",
              ],
            ],
          },
        },
        "Transfers to the USA (Groq, and Vercel's corporate access to its own infrastructure) rely on the providers' standard contractual clauses approved by the European Commission.",
      ],
    },
    {
      id: "cookies",
      heading: "Cookies and browser storage",
      body: [
        "We set exactly three cookies. All of them exist to keep you signed in; none is used for tracking, analytics or advertising.",
        {
          table: {
            head: ["Name", "Purpose", "Lifetime"],
            rows: [
              ["access_token", "Proves who you are on each request. Not readable by scripts (httpOnly).", "15 minutes"],
              ["refresh_token", "Quietly renews your session so you are not signed out every 15 minutes. httpOnly.", "30 days"],
              ["csrf_token", "Protects against forged requests sent from other websites.", "Until the session ends"],
            ],
          },
        },
        "Browser storage (localStorage) keeps your theme, language, accent colour and whether you hid an insight card. It never leaves your device and we cannot read it.",
        "There is no cookie banner because the law requires consent only for **non-essential** cookies — and we have none.",
      ],
    },
    {
      id: "security",
      heading: "How we protect it",
      body: [
        "Everything travels over HTTPS. Passwords are stored as bcrypt hashes; sign-in and email tokens as SHA-256 hashes — a copy of our database would not reveal either.",
        "Data at rest is encrypted by our database provider. It is **not end-to-end encrypted**: technically, Tellday can read your records. That is what lets the assistant work and lets us restore your access when something breaks. Nobody reads them for any other reason, and nobody does so as a matter of routine. If your diary needs stronger guarantees than that, Tellday is not yet the right place for it — we would rather say so plainly.",
      ],
    },
    {
      id: "retention",
      heading: "How long we keep it",
      body: [
        {
          list: [
            "**Your records and account** — for as long as the account exists. Deleting the account erases everything at once (see “Your rights”).",
            "**Sign-in sessions** — 30 days without use, then removed automatically. **Email codes and reset links** — 30 minutes and 1 hour respectively, then removed.",
            "**Security log** — for a limited period defined by our hosting provider's log retention, then gone.",
            "**Emails we sent you** — our email provider keeps delivery records for a short period, for troubleshooting.",
          ],
        },
      ],
    },
    {
      id: "rights",
      heading: "Your rights, and how to use them",
      body: [
        {
          list: [
            "**Delete everything.** Settings → Profile → Delete account. It asks for your password, then removes your account and every record — immediately and irreversibly. No archive, no grace period. You will receive one last email confirming it.",
            `**Export.** The assistant's data can be exported from Settings today. A full export of all your records is on our roadmap; until it ships, write to ${mail(S)} and you will receive it within 30 days in a machine-readable format.`,
            "**Correct.** Name and avatar — in Settings. Email address — write to us.",
            "**Withdraw consent.** Switch the assistant, or its diary access, off in Settings. What was processed before stays lawful; nothing new is sent.",
            `**Access, object, restrict.** Write to ${mail(S)}.`,
            "**Complain.** If you believe we handle your data unlawfully, you can complain to a supervisory authority — in Ukraine, the Ukrainian Parliament Commissioner for Human Rights; in the EU, the data protection authority of your country. We would rather hear from you first, but you do not have to.",
          ],
        },
      ],
    },
    {
      id: "children",
      heading: "Age",
      body: [
        "Tellday is for people aged 16 and over. If you learn that someone younger has an account, tell us and we will remove it.",
      ],
    },
    {
      id: "changes",
      heading: "Changes to this policy",
      body: [
        "When something that matters changes — a new processor, a new purpose — we tell you by email or in the app before it takes effect. Clarifications that change nothing about how your data is handled are simply published here with a new date.",
      ],
    },
    {
      id: "contact",
      heading: "Contact",
      body: [`${mail(S)} — for anything about your data, and for everything else too. One address, read by a person.`],
    },
  ],
};

const uk: LegalDoc = {
  title: "Політика конфіденційності",
  lead:
    "Тут пояснено, які дані збирає Tellday, навіщо, куди вони йдуть і що ви можете з цим зробити. Описано те, що продукт робить насправді сьогодні, — а не те, що зазвичай пишуть у шаблонах.",
  updated: UPDATED.uk,
  sections: [
    {
      id: "who",
      heading: "Хто відповідає за ваші дані",
      body: [
        `Сервіс Tellday надає **${CONTACTS.controller.uk}**, Україна — володілець (контролер) ваших персональних даних у розумінні GDPR і Закону України «Про захист персональних даних». З будь-якого питання щодо даних пишіть на ${mail(S)}. Відповідаємо протягом 30 днів, зазвичай значно швидше.`,
      ],
    },
    {
      id: "data",
      heading: "Які дані ми збираємо",
      body: [
        "Лише ті, без яких продукт не працює. Немає рекламного профілю, немає аналітичних трекерів, ми нічого не купуємо про вас і нікому не продаємо.",
        {
          table: {
            head: ["Категорія", "Що саме", "Навіщо"],
            rows: [
              [
                "Акаунт",
                "Електронна адреса, ім'я, необов'язкове фото профілю (зберігається як зображення в нашій базі) і хеш пароля — ніколи сам пароль.",
                "Щоб створити акаунт, впускати вас і надсилати листи, що його захищають.",
              ],
              [
                "Ваші записи",
                "Навички та їхні цілі; щоденні відмітки й витрачений час; настрій (1–5) і нотатки щоденника; задачі плану дня.",
                "Це і є продукт: ваша сітка, статистика, щоденник.",
              ],
              [
                "Налаштування",
                "Мова, тема, акцентний колір, вигляд таблиці, приховані віджети статистики, налаштування помічника (увімкнено/вимкнено, доступ до щоденника, форма звертання) і момент, коли ви дали згоду.",
                "Щоб застосунок виглядав однаково на всіх пристроях і пам'ятав ваш вибір.",
              ],
              [
                "Написане помічником",
                "Листи й підказки, які помічник склав для вас, і кількість запитів за день.",
                "Щоб показати їх вам знову і застосувати денну квоту.",
              ],
              [
                "Журнал безпеки",
                "Електронна адреса та IP-адреса при реєстрації, вході й поновленні сесії.",
                "Щоб помічати спроби зламу й зловживання.",
              ],
              [
                "Технічні",
                "Три cookie й кілька ключів у сховищі браузера — див. «Cookie і сховище браузера».",
                "Щоб тримати вас у системі й пам'ятати налаштування вигляду.",
              ],
            ],
          },
        },
        "Ми не збираємо геолокацію, контакти, ідентифікатори пристрою чи будь-що про вас з інших сайтів.",
      ],
    },
    {
      id: "why",
      heading: "Навіщо ми це обробляємо і на якій підставі",
      body: [
        {
          list: [
            "**Щоб надавати сервіс, про який ви попросили** — виконання договору (GDPR ст. 6(1)(b)). Сюди входять акаунт, записи, налаштування і листи, без яких це не працює: код підтвердження, посилання на скидання пароля, повідомлення про зміну пароля чи видалення акаунта.",
            "**Щоб сервіс був безпечним** — наш законний інтерес (ст. 6(1)(f)). Сюди входять журнал безпеки, обмеження частоти запитів і безпекові листи, які не можна вимкнути.",
            "**Щоб працював AI-помічник** — ваша згода (ст. 6(1)(a)), яку ви даєте окремо в застосунку і можете відкликати будь-коли. Дозвіл читати щоденник — це друга, окрема згода.",
          ],
        },
      ],
    },
    {
      id: "assistant",
      heading: "AI-помічник",
      body: [
        "Помічник **вимкнений, доки ви його не увімкнете**. Коли увімкнете — потрібні дані надсилаються компанії **Groq, Inc. (США)**, яка запускає мовну модель, що пише відповіді.",
        "**Що він бачить:** назви ваших навичок, відмітки й час, настрій і статистику, пораховану з них. **Текст щоденника надсилається лише якщо ви окремо дозволите «Дозволити читати щоденник».** Без цього дозволу нотатки не залишають нашу базу.",
        "**На ваших даних не навчають моделі.** Умови нашого провайдера забороняють навчання на даних клієнтів. Запити обробляються, щоб дати відповідь; історію розмов ми не зберігаємо. Листи й підказки помічника зберігаються, щоб ви могли їх перечитати, — і ви можете видалити їх будь-коли.",
        "**Перевірка на кризу.** Той самий текст окремим запитом до того ж провайдера перевіряється на ознаки того, що вам може бути важко, — щоб помічник відповів обережно й показав, куди звернутися. Це не діагноз, ніхто в Tellday цього не читає, і жодних нових даних, яких помічник уже не отримав, тут не задіяно.",
        "**Як вимкнути.** Налаштування → Помічник. «Видалити дані помічника» негайно прибирає всі листи й підказки; там само доступний експорт.",
      ],
    },
    {
      id: "processors",
      heading: "Де зберігаються дані і хто допомагає їх обробляти",
      body: [
        "Власних серверів у нас немає. Ці компанії обробляють дані виключно за нашими вказівками, за договорами про обробку і лише в зазначеній ролі:",
        {
          table: {
            head: ["Провайдер", "Роль", "Розташування"],
            rows: [
              ["Neon, Inc.", "База даних — усі ваші записи.", "Франкфурт, Німеччина (ЄС)"],
              ["Vercel, Inc.", "Хостинг і виконання застосунку.", "Обчислення в ЄС; Vercel — компанія зі США"],
              ["Resend, Inc.", "Надсилання службових листів.", "Ірландія (ЄС)"],
              ["Groq, Inc.", "Мовна модель помічника — лише якщо ви його увімкнули.", "США"],
              [
                "Upstash, Inc.",
                "Короткоживучі лічильники запитів для обмеження частоти: IP-адреса або ідентифікатор користувача, зберігаються 15 хвилин.",
                "ЄС",
              ],
              [
                "Sentry (Functional Software, Inc.)",
                "Моніторинг помилок: коли щось ламається, отримує саму помилку, файл і рядок, де це сталось, і маршрут — навмисно без тіл запитів, cookie, заголовків і вашої особи.",
                "Франкфурт, Німеччина (ЄС)",
              ],
            ],
          },
        },
        "Передача даних до США (Groq, а також корпоративний доступ Vercel до власної інфраструктури) відбувається на підставі стандартних договірних положень провайдерів, затверджених Європейською комісією.",
      ],
    },
    {
      id: "cookies",
      heading: "Cookie і сховище браузера",
      body: [
        "Ми ставимо рівно три cookie. Усі три потрібні, щоб тримати вас у системі; жоден не використовується для відстеження, аналітики чи реклами.",
        {
          table: {
            head: ["Назва", "Призначення", "Термін"],
            rows: [
              ["access_token", "Підтверджує, хто ви, на кожному запиті. Недоступний скриптам (httpOnly).", "15 хвилин"],
              ["refresh_token", "Непомітно поновлює сесію, щоб вас не виходило кожні 15 хвилин. httpOnly.", "30 днів"],
              ["csrf_token", "Захищає від підроблених запитів з інших сайтів.", "До кінця сесії"],
            ],
          },
        },
        "Сховище браузера (localStorage) зберігає тему, мову, акцентний колір і те, чи ви приховали картку підказки. Ці дані не залишають ваш пристрій, і ми їх не бачимо.",
        "Банера про cookie немає, бо закон вимагає згоди лише на **неістотні** cookie — а таких у нас немає.",
      ],
    },
    {
      id: "security",
      heading: "Як ми їх захищаємо",
      body: [
        "Усе передається через HTTPS. Паролі зберігаються як bcrypt-хеші; токени входу й токени з листів — як SHA-256-хеші: копія нашої бази не розкрила б ні перших, ні других.",
        "Дані в базі шифрує наш провайдер зберігання. Це **не наскрізне (end-to-end) шифрування**: технічно Tellday може прочитати ваші записи. Саме це дає змогу працювати помічнику і відновлювати ваш доступ, коли щось ламається. Ніхто не читає їх з інших причин і ніхто не робить цього регулярно. Якщо вашому щоденнику потрібні сильніші гарантії — Tellday поки не те місце, і ми воліємо сказати це прямо.",
      ],
    },
    {
      id: "retention",
      heading: "Скільки ми їх зберігаємо",
      body: [
        {
          list: [
            "**Записи й акаунт** — доки існує акаунт. Видалення акаунта стирає все одразу (див. «Ваші права»).",
            "**Сесії входу** — 30 днів без використання, потім видаляються автоматично. **Коди з листів і посилання на скидання** — 30 хвилин і 1 година відповідно, потім видаляються.",
            "**Журнал безпеки** — обмежений період, визначений політикою зберігання логів нашого хостинг-провайдера, потім зникає.",
            "**Надіслані вам листи** — поштовий провайдер зберігає записи про доставку короткий час для діагностики.",
          ],
        },
      ],
    },
    {
      id: "rights",
      heading: "Ваші права і як ними скористатися",
      body: [
        {
          list: [
            "**Видалити все.** Налаштування → Профіль → Видалити акаунт. Застосунок запитає пароль і видалить акаунт разом з усіма записами — негайно й безповоротно. Без архіву й без відтермінування. Ви отримаєте останній лист із підтвердженням.",
            `**Експортувати.** Дані помічника можна експортувати з Налаштувань уже сьогодні. Повний експорт усіх записів — у планах; доки його немає, напишіть на ${mail(S)} — і отримаєте дані протягом 30 днів у машинозчитуваному форматі.`,
            "**Виправити.** Ім'я і фото — в Налаштуваннях. Електронну адресу — напишіть нам.",
            "**Відкликати згоду.** Вимкніть помічника або його доступ до щоденника в Налаштуваннях. Обробка до того залишається законною; нічого нового не надсилається.",
            `**Отримати доступ, заперечити, обмежити.** Напишіть на ${mail(S)}.`,
            "**Поскаржитися.** Якщо ви вважаєте, що ми обробляємо дані незаконно, можете звернутися до наглядового органу — в Україні це Уповноважений Верховної Ради з прав людини; в ЄС — орган захисту даних вашої країни. Ми б воліли, щоб ви спершу написали нам, але не зобов'язані.",
          ],
        },
      ],
    },
    {
      id: "children",
      heading: "Вік",
      body: [
        "Tellday — для людей від 16 років. Якщо ви дізнаєтесь, що акаунт має хтось молодший, повідомте нам — і ми його видалимо.",
      ],
    },
    {
      id: "changes",
      heading: "Зміни цієї політики",
      body: [
        "Коли змінюється щось суттєве — новий провайдер, нова мета обробки — ми повідомляємо листом або в застосунку до того, як зміна набуде чинності. Уточнення, які нічого не змінюють в обробці даних, просто публікуються тут із новою датою.",
      ],
    },
    {
      id: "contact",
      heading: "Контакти",
      body: [`${mail(S)} — з усього, що стосується даних, і з решти питань також. Одна адреса, яку читає людина.`],
    },
  ],
};

export const PRIVACY: Record<Locale, LegalDoc> = { en, uk };
