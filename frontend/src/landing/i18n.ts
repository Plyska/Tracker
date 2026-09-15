/**
 * Словник лендінгу. Свідомо НЕ i18next: лендінг — окремий легкий entry, і 20 КБ бібліотеки
 * заради двох мов і плоского словника не окупаються. Англійська — основна, українська — повний
 * дзеркальний переклад (тип `Dict` виводиться з `en`, тож пропущений ключ — помилка компіляції).
 *
 * Тон — як у продукті: коротко, конкретно, тепло, на «ти». Без сорому й мотиваційної води.
 * Українською уникаємо форм минулого часу до читача (несуть рід) — це правило тон-тестів помічника.
 */
export type Locale = "en" | "uk";

export const LOCALES: readonly Locale[] = ["en", "uk"];

/** Шлях локалі на сайті: англійська — корінь, українська — `/uk`. */
export const localePath = (locale: Locale): string => (locale === "uk" ? "/uk" : "/");

/** Локаль із URL: `/uk` (і `/uk/`) → uk, решта → en. */
export const localeFromPath = (pathname: string): Locale =>
  pathname === "/uk" || pathname.startsWith("/uk/") ? "uk" : "en";

/**
 * Сторінки лендінг-entry. Головна плюс юридичні документи: вони живуть тут, а не в SPA, бо мають
 * читатись без JS, індексуватись і не тягнути мегабайтний бандл застосунку заради тексту.
 */
export type Page = "home" | "privacy" | "terms";
export const PAGES: readonly Page[] = ["home", "privacy", "terms"];

/** URL сторінки для локалі: `/`, `/uk`, `/privacy`, `/uk/terms`. Дзеркало `pageFromPath`. */
export const pagePath = (locale: Locale, page: Page): string => {
  const base = locale === "uk" ? "/uk" : "";
  return page === "home" ? base || "/" : `${base}/${page}`;
};

/** Сторінка з URL; хвостові слеші й префікс локалі ігноруються. Невідоме → головна. */
export const pageFromPath = (pathname: string): Page => {
  const rest = pathname.replace(/^\/uk(?=\/|$)/, "").replace(/\/+$/, "");
  return rest === "/privacy" ? "privacy" : rest === "/terms" ? "terms" : "home";
};

const en = {
  meta: {
    title: "Tellday — tell your day, keep the rest",
    description:
      "Habits, mood, diary and a day plan in one place. Say how the day went in one sentence — Tellday turns it into records, and an AI assistant turns those into something worth reading.",
    ogAlt: "Tellday: a habit grid being filled from a one-sentence check-in",
  },
  nav: {
    features: "Features",
    companion: "AI assistant",
    pricing: "Pricing",
    faq: "FAQ",
    login: "Log in",
    start: "Start free",
    theme: "Toggle theme",
    lang: "Українською",
    langShort: "UK",
    skip: "Skip to content",
  },
  hero: {
    eyebrow: "Habits · Mood · Diary · Planner · AI assistant",
    h1a: "Tell your day.",
    h1b: "Tellday keeps the rest.",
    sub: "Habits, mood and diary in one place. An AI assistant turns what you log into something worth reading.",
    cta: "Start free",
    ctaSecondary: "See how it works",
    fine: "Free at launch. No card. English and Ukrainian.",
    demoLabel: "Evening check-in",
    demoAria: "Live demo: a check-in sentence fills the habit grid for today",
    habitCol: "Habit",
    moodQuestion: "How was the day?",
    companion: "AI assistant",
    reply: "Saved. Meditation slipped on a short-sleep day — that tracks. Five minutes tomorrow, or a full skip?",
    // Речення чек-іну. Порядок фрагментів = порядок появи клітинок.
    sentence: {
      run: "Ran 30 min",
      read: ", read a bit",
      med: ", skipped meditation.",
      mood: " Mood 3.",
    },
    minutesChip: "30m",
    exampleData: "Example data",
  },
  grid: {
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    habits: {
      water: "Water 2L",
      read: "Reading",
      med: "Meditation",
      run: "Run",
      gym: "Gym",
      english: "English",
      guitar: "Guitar",
    },
    today: "Today",
    /** Суфікс хвилин у клітинці часової навички (як у TimeCell застосунку). */
    min: "m",
  },
  problem: {
    eyebrow: "Why trackers die",
    h2: "Six checkboxes every night is the habit you drop first.",
    p: "Tellday asks one question instead — how was the day? — and writes the ticks, minutes and mood for you. You confirm before anything is saved.",
    gridAria: "The habit table in two layouts: days as columns or days as rows",
    layoutColumns: "Days in columns",
    layoutRows: "Days in rows",
  },
  features: {
    eyebrow: "What's inside",
    h2: "Real parts of the app, not illustrations",
    items: {
      types: {
        title: "Three kinds of habit",
        body: "Daily is a tick. Frequency is «3× a week» with a 1/3 badge. Timed counts minutes toward a weekly hours target.",
      },
      mood: {
        title: "Mood next to the ticks",
        body: "One tap, 1 to 5. Over time you see which habits your good days share — a correlation, not a verdict.",
      },
      diary: {
        title: "A diary that stays yours",
        body: "Rich text, a feed of days, mood beside each entry. The assistant reads it only if you allow.",
      },
      planner: {
        title: "A plan for the day",
        body: "Timed tasks for the routine, untimed for the list. Tag a task with a habit and the tick lands in the grid.",
      },
    },
    moodLabels: ["Awful", "Bad", "Okay", "Good", "Great"],
    moodHint: "Mood is 0.8 higher on run days",
    diary: [
      { day: "Wednesday", text: "Good day. Exercise in the morning, then two hours of English." },
      { day: "Monday", text: "Heavy week. Low on energy. Slept badly three nights in a row." },
      { day: "Sunday", text: "Called my parents — long overdue. Mood went straight up." },
    ],
    planner: {
      title: "Thursday",
      tasks: [
        { time: "07:30 – 08:15", title: "Run", habit: "Run" },
        { time: "09:00 – 12:00", title: "Deep work", habit: null },
        { time: null, title: "Call parents", habit: null },
      ],
      untimed: "No time",
    },
    types: {
      daily: "daily",
      weekly: "3× / week",
      timed: "5 h / week",
    },
  },
  stats: {
    eyebrow: "Statistics",
    h2: "A week becomes a year",
    p: "Every tick lands in the same grid. Zoom out: streaks, perfect days, your weekday profile and the habits that pull the others along.",
    metrics: {
      completion: "Completion",
      currentStreak: "Current streak",
      longestStreak: "Longest streak",
      perfect: "Perfect days",
      bestHabit: "Best habit",
      mood: "Avg. mood",
      days: "days",
      ofFive: "of 5",
    },
    heatmap: { title: "Year at a glance", less: "Less", more: "More", aria: "Year heatmap of daily completion" },
    weekdays: { title: "Days of the week", best: "Best — Saturday · 83%", worst: "Weakest — Wednesday · 56%" },
    movers: { title: "What changed", up: "Up", down: "Down" },
    synergy: { title: "Habit synergy", line: "Gym pulls exercise along: 82% vs 54% usually." },
    moodCorr: { title: "Mood ↔ habits", line: "Mood is 0.8 higher on run days, 0.5 lower after skipped sleep-ins." },
    vsLast: "vs last month",
  },
  companion: {
    eyebrow: "AI assistant",
    h2: "An AI assistant that reads what you write. Not a coach, not a judge.",
    p: "A short letter every week, gentle notes on the dashboard, one-sentence answers to your check-ins.",
    letter: {
      title: "Your week",
      highlights: "What went well",
      slips: "What slipped",
      question: "One question",
      lines: {
        h1: "Reading held every single day — the first full week since spring.",
        h2: "Run: 2 h 40 min against a 3 h target. Close.",
        s1: "Meditation showed up twice, both times on run days.",
        s2: "Mood dipped midweek, then recovered by the weekend.",
        q: "Both quiet days came after short sleep. Keep an eye on it, or leave it for now?",
      },
    },
    insight: {
      text: "English: 4.8 h left with 2 days in the week.",
      action: "Talk about it",
    },
    confirm: {
      title: "Check-in",
      items: ["Run — 30 min", "Reading — done", "Meditation — skipped", "Mood — 3 of 5"],
      save: "Save 4",
      cancel: "Cancel",
    },
    rules: {
      title: "Three rules it never breaks",
      write: { t: "It never writes without your yes.", d: "Every check-in becomes a card you confirm." },
      diary: { t: "It reads your diary only if you allow it.", d: "A separate switch, off by default." },
      off: { t: "You can turn it off and delete its data.", d: "One button in Settings removes every letter." },
    },
    beta: "Beta",
  },
  personalization: {
    eyebrow: "Yours",
    h2: "Light or dark, five accents, two languages",
    p: "Pick a look — Tellday keeps it on every device.",
    accents: { violet: "Violet", emerald: "Emerald", blue: "Blue", orange: "Orange" },
    light: "Light",
    dark: "Dark",
  },
  pricing: {
    eyebrow: "Pricing",
    h2: "Free at launch. Everything included.",
    free: {
      name: "Free",
      price: "$0",
      period: "at launch",
      features: [
        "Unlimited habits — daily, weekly, timed",
        "Mood log and correlations",
        "Diary and day planner",
        "Statistics, streaks, year heatmap",
        "Weekly letter and check-ins",
        "Themes, accents, two languages",
      ],
      cta: "Create an account",
    },
    pro: {
      name: "Pro",
      badge: "Coming later",
      price: "Soon",
      period: "",
      features: [
        "Everything in Free",
        "Longer history and data export",
        "More accents, icons and layouts",
        "Early access to new assistant features",
      ],
      cta: "Not available yet",
    },
  },
  faq: {
    eyebrow: "Questions",
    h2: "Things people ask",
    items: [
      { q: "Who can see my diary?", a: "You. The assistant reads it only if you turn on a separate switch, which is off by default." },
      { q: "What does the assistant see?", a: "Habit names, ticks, minutes and mood. Your diary only with permission. It never writes without a confirmation card." },
      { q: "Is my data used to train AI?", a: "No. Requests go to a model provider under terms that forbid training on your data." },
      { q: "Can I export or delete my data?", a: "Deleting your account removes everything. Export and deletion of what the assistant wrote is already there; full export is on the roadmap." },
      { q: "Is there a mobile app?", a: "Tellday works in a phone browser with a small-screen layout. Native apps come after the web version settles." },
      { q: "Which languages?", a: "English and Ukrainian, in the app and in the assistant's letters." },
    ],
  },
  cta: {
    h2: "Tell your day tonight.",
    p: "One sentence in the evening. A grid that fills itself. A letter on Monday.",
    button: "Start free",
    login: "Already have an account? Log in",
  },
  footer: {
    tagline: "Tell your day. Tellday keeps the rest.",
    login: "Log in",
    register: "Create account",
    made: "Made in Ukraine",
    rights: "Tellday",
  },
  legal: {
    eyebrow: "Legal",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    updated: "Last updated",
    contents: "Contents",
    meta: {
      privacy: {
        title: "Privacy Policy — Tellday",
        description: "What Tellday collects, why, where it goes, and what you can do about it.",
      },
      terms: {
        title: "Terms of Service — Tellday",
        description: "The rules for using Tellday, in plain language.",
      },
    },
  },
};

/** Тип словника виводиться з англійського (без `as const`: значення — рядки, не літерали). */
export type Dict = typeof en;

const uk: Dict = {
  meta: {
    title: "Tellday — розкажи свій день, решту запишемо",
    description:
      "Звички, настрій, щоденник і план дня в одному місці. Розкажи, як минув день, одним реченням — Tellday перетворить його на записи, а AI-асистент дасть їм сенс.",
    ogAlt: "Tellday: сітка звичок заповнюється з чек-іну одним реченням",
  },
  nav: {
    features: "Можливості",
    companion: "AI-асистент",
    pricing: "Ціна",
    faq: "Питання",
    login: "Увійти",
    start: "Почати безкоштовно",
    theme: "Перемкнути тему",
    lang: "English",
    langShort: "EN",
    skip: "До вмісту",
  },
  hero: {
    eyebrow: "Звички · Настрій · Щоденник · План дня · AI-асистент",
    h1a: "Розкажи свій день.",
    h1b: "Решту запише Tellday.",
    sub: "Звички, настрій і щоденник в одному місці. AI-асистент перетворює записане на сенс, а не на бал.",
    cta: "Почати безкоштовно",
    ctaSecondary: "Як це працює",
    fine: "Безкоштовно на запуску. Без картки. Українською та англійською.",
    demoLabel: "Вечірній чек-ін",
    demoAria: "Живе демо: речення чек-іну заповнює сітку звичок за сьогодні",
    habitCol: "Навичка",
    moodQuestion: "Як минув день?",
    companion: "AI-асистент",
    reply: "Записано. Медитація випала в день, коли мало сну — це логічно. Завтра п’ять хвилин чи пропускаємо повністю?",
    sentence: {
      run: "Біг 30 хв",
      read: ", трохи читання",
      med: ", медитацію пропускаю.",
      mood: " Настрій 3.",
    },
    minutesChip: "30хв",
    exampleData: "Приклад даних",
  },
  grid: {
    days: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"],
    habits: {
      water: "Вода 2л",
      read: "Читання",
      med: "Медитація",
      run: "Біг",
      gym: "Зал",
      english: "Англійська",
      guitar: "Гітара",
    },
    today: "Сьогодні",
    min: "хв",
  },
  problem: {
    eyebrow: "Чому трекери вмирають",
    h2: "Шість чекбоксів щовечора — це звичка, яку кидають першою.",
    p: "Tellday ставить одне питання — як минув день? — і записує галочки, хвилини й настрій за тебе. Ти підтверджуєш перед тим, як щось збережеться.",
    gridAria: "Таблиця звичок у двох орієнтаціях: дні в колонках або дні в рядках",
    layoutColumns: "Дні в колонках",
    layoutRows: "Дні в рядках",
  },
  features: {
    eyebrow: "Що всередині",
    h2: "Справжні частини застосунку, не ілюстрації",
    items: {
      types: {
        title: "Три типи звичок",
        body: "Щоденна — галочка. Частотна — «3× на тиждень» із бейджем 1/3. Часова — хвилини в рахунок годин на тиждень.",
      },
      mood: {
        title: "Настрій поруч із галочками",
        body: "Один тап, від 1 до 5. З часом видно, що спільного в твоїх хороших днів — кореляція, не вердикт.",
      },
      diary: {
        title: "Щоденник, який лишається твоїм",
        body: "Форматований текст, стрічка днів, настрій біля кожного запису. Асистент читає лише з дозволу.",
      },
      planner: {
        title: "План на день",
        body: "Задачі з часом — для розпорядку, без — для списку. Познач задачу навичкою, і галочка ляже в сітку.",
      },
    },
    moodLabels: ["Жахливо", "Погано", "Нормально", "Добре", "Чудово"],
    moodHint: "Настрій на 0.8 вищий у дні з бігом",
    diary: [
      { day: "Середа", text: "Гарний день. Зранку зарядка, потім дві години англійської." },
      { day: "Понеділок", text: "Важкий тиждень. Сил майже нема. Три ночі поспіль поганий сон." },
      { day: "Неділя", text: "Дзвінок батькам — давно варто було. Настрій одразу вгору." },
    ],
    planner: {
      title: "Четвер",
      tasks: [
        { time: "07:30 – 08:15", title: "Біг", habit: "Біг" },
        { time: "09:00 – 12:00", title: "Глибока робота", habit: null },
        { time: null, title: "Подзвонити батькам", habit: null },
      ],
      untimed: "Без часу",
    },
    types: {
      daily: "щодня",
      weekly: "3× / тиждень",
      timed: "5 год / тиждень",
    },
  },
  stats: {
    eyebrow: "Статистика",
    h2: "Тиждень стає роком",
    p: "Кожна галочка лягає в ту саму сітку. Віддалися: серії, ідеальні дні, профіль тижня і звички, що тягнуть за собою інші.",
    metrics: {
      completion: "Виконання",
      currentStreak: "Поточна серія",
      longestStreak: "Найдовша серія",
      perfect: "Ідеальні дні",
      bestHabit: "Найкраща навичка",
      mood: "Сер. настрій",
      days: "днів",
      ofFive: "з 5",
    },
    heatmap: { title: "Рік одним поглядом", less: "Менше", more: "Більше", aria: "Річний heatmap виконання" },
    weekdays: { title: "Дні тижня", best: "Найкращий — субота · 83%", worst: "Найслабший — середа · 56%" },
    movers: { title: "Що змінилось", up: "Зросли", down: "Просіли" },
    synergy: { title: "Синергія звичок", line: "Зал тягне за собою зарядку: 82% проти 54% зазвичай." },
    moodCorr: { title: "Настрій ↔ звички", line: "Настрій на 0.8 вищий у дні з бігом і на 0.5 нижчий після короткого сну." },
    vsLast: "проти минулого місяця",
  },
  companion: {
    eyebrow: "AI-асистент",
    h2: "AI-асистент, який читає те, що ти пишеш. Не коуч і не суддя.",
    p: "Короткий лист щотижня, м’які нотатки на головній, відповідь одним реченням на твій чек-ін.",
    letter: {
      title: "Твій тиждень",
      highlights: "Що вдалося",
      slips: "Що просіло",
      question: "Одне питання",
      lines: {
        h1: "Читання трималося щодня — перший повний тиждень із весни.",
        h2: "Біг: 2 год 40 хв проти цілі 3 год. Зовсім близько.",
        s1: "Медитація з’явилася двічі, обидва рази в дні з бігом.",
        s2: "Настрій просів у середині тижня, а до вихідних вирівнявся.",
        q: "Обидва тихі дні прийшли після короткого сну. Тримати на оці чи поки лишити?",
      },
    },
    insight: {
      text: "Англійська: лишилось 4.8 год, а до кінця тижня 2 дні.",
      action: "Обговорити",
    },
    confirm: {
      title: "Чек-ін",
      items: ["Біг — 30 хв", "Читання — є", "Медитація — пропущено", "Настрій — 3 з 5"],
      save: "Записати 4",
      cancel: "Скасувати",
    },
    rules: {
      title: "Три правила, яких він не порушує",
      write: { t: "Нічого не пише без твого «так».", d: "Кожен чек-ін стає карткою, яку ти підтверджуєш." },
      diary: { t: "Читає щоденник лише з дозволу.", d: "Окремий перемикач, вимкнений за замовчуванням." },
      off: { t: "Його можна вимкнути й видалити дані.", d: "Одна кнопка в налаштуваннях прибирає всі листи." },
    },
    beta: "Бета",
  },
  personalization: {
    eyebrow: "Твоє",
    h2: "Світла чи темна, п’ять акцентів, дві мови",
    p: "Обери вигляд — Tellday збереже його на всіх пристроях.",
    accents: { violet: "Фіолетовий", emerald: "Смарагдовий", blue: "Синій", orange: "Помаранчевий" },
    light: "Світла",
    dark: "Темна",
  },
  pricing: {
    eyebrow: "Ціна",
    h2: "Безкоштовно на запуску. Усе включено.",
    free: {
      name: "Free",
      price: "0 $",
      period: "на запуску",
      features: [
        "Безліміт звичок — щоденних, частотних, часових",
        "Лог настрою і кореляції",
        "Щоденник і планувальник дня",
        "Статистика, серії, річний heatmap",
        "Лист тижня і чек-іни",
        "Теми, акценти, дві мови",
      ],
      cta: "Створити акаунт",
    },
    pro: {
      name: "Pro",
      badge: "Пізніше",
      price: "Скоро",
      period: "",
      features: [
        "Усе з Free",
        "Довша історія та експорт даних",
        "Більше акцентів, іконок і розкладок",
        "Ранній доступ до нових функцій асистента",
      ],
      cta: "Поки недоступно",
    },
  },
  faq: {
    eyebrow: "Питання",
    h2: "Про що запитують",
    items: [
      { q: "Хто бачить мій щоденник?", a: "Ти. Асистент читає його лише з окремого перемикача, вимкненого за замовчуванням." },
      { q: "Що бачить асистент?", a: "Назви звичок, галочки, хвилини й настрій. Щоденник — лише з дозволу. Нічого не пише без картки підтвердження." },
      { q: "Чи навчається AI на моїх даних?", a: "Ні. Запити йдуть до провайдера моделі на умовах, що забороняють навчання на твоїх даних." },
      { q: "Чи можна експортувати або видалити дані?", a: "Видалення акаунта прибирає все. Експорт і видалення написаного асистентом уже є; повний експорт — у планах." },
      { q: "Є мобільний застосунок?", a: "Tellday працює в браузері телефона з розкладкою для малих екранів. Нативні застосунки — після вебверсії." },
      { q: "Які мови?", a: "Українська та англійська — у застосунку й у листах асистента." },
    ],
  },
  cta: {
    h2: "Розкажи свій день сьогодні ввечері.",
    p: "Одне речення ввечері. Сітка, що заповнюється сама. Лист у понеділок.",
    button: "Почати безкоштовно",
    login: "Уже є акаунт? Увійти",
  },
  footer: {
    tagline: "Розкажи свій день. Решту запише Tellday.",
    login: "Увійти",
    register: "Створити акаунт",
    made: "Зроблено в Україні",
    rights: "Tellday",
  },
  legal: {
    eyebrow: "Документи",
    privacy: "Політика конфіденційності",
    terms: "Умови користування",
    updated: "Оновлено",
    contents: "Зміст",
    meta: {
      privacy: {
        title: "Політика конфіденційності — Tellday",
        description: "Які дані збирає Tellday, навіщо, куди вони йдуть і що ви можете з цим зробити.",
      },
      terms: {
        title: "Умови користування — Tellday",
        description: "Правила користування Tellday простою мовою.",
      },
    },
  },
};

export const dictionaries: Record<Locale, Dict> = { en, uk };
