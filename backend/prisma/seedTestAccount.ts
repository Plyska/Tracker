import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

/**
 * ПОВНЕ перестворення тестового акаунта з багатим наповненням — щоб коректно тестувати
 * статистику (ADR 0010/0011) і підказки AI-помічника (ADR 0012).
 *
 * Запуск: `npm run db:seed:test`
 * УВАГА: видаляє користувача TEST_EMAIL разом з усіма даними (каскад) і створює заново.
 *
 * Дані ДЕТЕРМІНОВАНІ (seeded PRNG) — повторний запуск дає ту саму картину, тож очікувані
 * показники відомі й регресії помітні. Скрипт у кінці друкує, які саме інсайти мають спрацювати.
 *
 * Що покривається:
 *  - усі 3 типи навичок: щоденні / N×тиждень (count) / часові (хвилини/тиждень);
 *  - історія ~120 днів → Week/Month/Year/All-time, movers (порівняння з попереднім вікном);
 *  - настрій ~85% днів → moodAverage, moodCorrelations, moodVsCompletion, weekday-інсайти;
 *  - синергія (Зал → Зарядка), обірваний довгий стрік (Медитація), ідеальні дні;
 *  - 3 дні поспіль низького настрою → інсайт `lowMoodStreak` (severity care);
 *  - записи щоденника (HTML як з TipTap) → фід + контекст для AI;
 *  - задачі Planner: на сьогодні з часом, «Загальна» без дати, минулі (архів).
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const TEST_EMAIL = "test@tracker.app";
// Свідомо простий — це локальний тестовий акаунт. Форма ЛОГІНУ (фронт+бек) вимагає лише
// непорожність; правило «мінімум 8 символів» діє тільки при РЕЄСТРАЦІЇ, тож 6 символів тут ок.
const TEST_PASSWORD = "123123";
const TEST_NAME = "Тест Тестенко";

const HISTORY_DAYS = 120; // глибина історії відміток
const MOOD_DAYS = 110; // за скільки останніх днів логуємо настрій
const MOOD_LOG_RATE = 0.85; // частка днів із оцінкою настрою

// ── date-хелпери (рядкові ISO; лексикографічно == хронологічно, як у stats.service) ──────────
const toISO = (d: Date): string => d.toISOString().slice(0, 10);
const parts = (iso: string): [number, number, number] =>
  iso.split("-").map(Number) as [number, number, number];
const addDaysISO = (iso: string, n: number): string => {
  const [y, m, d] = parts(iso);
  return toISO(new Date(Date.UTC(y, m - 1, d + n)));
};
/** 0=Пн … 6=Нд (той самий інваріант, що getWeekDays/mondayISO). */
const dowMon0 = (iso: string): number => {
  const [y, m, d] = parts(iso);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
};
const mondayISO = (iso: string): string => addDaysISO(iso, -dowMon0(iso));

/** Детермінований PRNG (mulberry32) — щоб наповнення було відтворюваним. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TODAY = toISO(new Date());
const THIS_MONDAY = mondayISO(TODAY);
const DAYS_LEFT_IN_WEEK = 6 - dowMon0(TODAY); // днів після сьогодні до неділі

// ── Профілі навичок ────────────────────────────────────────────────────────────────────────
// `kind`: daily = щоденна (обидві цілі null); count = weeklyTarget; timed = weeklyMinutesTarget.
// `moodBoost` — внесок у настрій дня, коли виконано (створює moodCorrelations).

interface DailyProfile {
  kind: "daily";
  name: string;
  color: string;
  icon: string;
  /** Базова ймовірність виконання; `trend` зсуває її з часом (для movers). */
  rate: number;
  trend?: number; // +0.2 = наприкінці періоду на 0.2 вище, ніж на початку
  moodBoost: number;
  /** Спец-режим: довгий стрік у минулому, потім повний обрив (→ інсайт streakBroken). */
  brokenStreak?: { runDays: number; brokeDaysAgo: number };
  /** Виконується частіше в дні, коли виконано названу навичку (→ синергія). */
  synergyWith?: string;
  synergyRate?: number;
}
interface CountProfile {
  kind: "count";
  name: string;
  color: string;
  icon: string;
  weeklyTarget: number;
  moodBoost: number;
  /** Офсети днів тижня (0=Пн) за k тижнів тому; k=0 — поточний (незавершений) тиждень. */
  weekDone: (k: number) => number[];
}
interface TimedProfile {
  kind: "timed";
  name: string;
  color: string;
  icon: string;
  weeklyMinutesTargetHours: number;
  moodBoost: number;
  /** Хвилини за день (0 = не робив) для дня тижня + номера тижня. */
  minutesFor: (dow: number, k: number, rng: () => number) => number;
}
type Profile = DailyProfile | CountProfile | TimedProfile;

const PROFILES: Profile[] = [
  // Найстабільніша — кандидат у bestHabit, тягне ідеальні дні.
  { kind: "daily", name: "Вода 2л", color: "#2563eb", icon: "Droplet", rate: 0.92, moodBoost: 0.1 },
  // Тренд угору → «покращилось» у movers.
  { kind: "daily", name: "Читання", color: "#6d28d9", icon: "BookOpen", rate: 0.7, trend: 0.2, moodBoost: 0.3 },
  // Довгий стрік (14 днів), обірваний 6 днів тому → інсайт streakBroken + просідання в movers.
  {
    kind: "daily",
    name: "Медитація",
    color: "#059669",
    icon: "Brain",
    rate: 0.6,
    moodBoost: 0.7,
    brokenStreak: { runDays: 14, brokeDaysAgo: 6 },
  },
  // Сильний внесок у настрій (moodCorrelation) + синергія з залом.
  {
    kind: "daily",
    name: "Зарядка",
    color: "#db2777",
    icon: "Dumbbell",
    rate: 0.45,
    moodBoost: 0.9,
    synergyWith: "Зал",
    synergyRate: 0.9,
  },
  // Count-ціль: минулі тижні виконані (тижневий стрік), ЦЬОГО тижня 0 → weeklyTargetAtRisk.
  {
    kind: "count",
    name: "Зал",
    color: "#ea580c",
    icon: "Bike",
    weeklyTarget: 3,
    moodBoost: 0.5,
    weekDone: (k) => {
      if (k === 0) return []; // поточний тиждень: ще нічого → ціль під загрозою
      if (k === 1) return [0, 2, 4, 5]; // перевиконання → тест капу 100%/тиждень
      if (k % 5 === 0) return [1]; // раз на 5 тижнів — недобір
      return [0, 2, 4];
    },
  },
  // День тижня НАВМИСНО «плаває» ((k*3)%7): якби ця навичка стояла лише в неділю, вона дала б
  // структурну АНТИ-кореляцію з Залом (Пн/Ср/Пт) — фальшива негативна синергія з |delta|~0.65
  // очолила б віджет замість задуманої Зал→Зарядка.
  { kind: "count", name: "Дзвінок батькам", color: "#f59e0b", icon: "Phone", weeklyTarget: 1, moodBoost: 0.4, weekDone: (k) => (k === 0 ? [] : [(k * 3) % 7]) },
  // Часові навички — для картки «Витрачений час», розподілу й тренду годин.
  {
    kind: "timed",
    name: "Англійська",
    color: "#0891b2",
    icon: "Languages",
    weeklyMinutesTargetHours: 5,
    moodBoost: 0.2,
    // У неділю рідше, але НЕ «ніколи» — інакше з'являється структурна анти-кореляція (див. вище).
    minutesFor: (dow, _k, rng) => (rng() < (dow === 6 ? 0.25 : 0.7) ? 30 + Math.floor(rng() * 5) * 15 : 0),
  },
  {
    kind: "timed",
    name: "Гітара",
    color: "#7c3aed",
    icon: "Music",
    weeklyMinutesTargetHours: 3,
    moodBoost: 0.6,
    minutesFor: (dow, _k, rng) => (dow >= 4 ? (rng() < 0.8 ? 45 + Math.floor(rng() * 4) * 15 : 0) : rng() < 0.35 ? 30 : 0),
  },
];

// Записи щоденника (HTML як з TipTap). Ключ — «днів тому».
const DIARY: { daysAgo: number; html: string }[] = [
  { daysAgo: 0, html: "<p>Важкий тиждень. Сил майже нема, і я не розумію, з чого це.</p><p>Спав погано три ночі поспіль.</p>" },
  { daysAgo: 1, html: "<p>Знову нічого не хочеться. Пропустив і медитацію, і зал.</p>" },
  { daysAgo: 2, html: "<p>Наче туман у голові. Витягнув тільки воду й трохи читання.</p>" },
  { daysAgo: 5, html: "<p>Був <strong>чудовий день</strong>. Зранку зарядка, потім дві години англійської.</p><ul><li>встав о 7:00</li><li>зал</li><li>дочитав розділ</li></ul>" },
  { daysAgo: 8, html: "<p>Зрозумів, що <em>медитація</em> реально тримає мене в тонусі. 14 днів поспіль!</p>" },
  { daysAgo: 12, html: "<h3>Плани на місяць</h3><p>Хочу дотягнути англійську до 5 годин на тиждень стабільно.</p>" },
  { daysAgo: 17, html: "<p>Втомився на роботі, але гітара врятувала вечір.</p>" },
  { daysAgo: 23, html: "<p>Дзвонив батькам — давно варто було. Настрій одразу вгору.</p>" },
  { daysAgo: 31, html: "<p>Тиждень вийшов рваний. Треба менше планувати й більше робити.</p>" },
  { daysAgo: 38, html: "<p>Помітив: коли йду в зал, то й зарядку зранку роблю. Працює зв'язкою.</p>" },
  { daysAgo: 45, html: "<p>Прочитав про звички. Головне — не рвати ланцюжок.</p>" },
  { daysAgo: 54, html: "<p>Спокійна субота. Гітара, кава, книжка.</p>" },
  { daysAgo: 63, html: "<p>Було важко почати, але після зарядки день пішов інакше.</p>" },
  { daysAgo: 72, html: "<p>Забив на все. Буває.</p>" },
  { daysAgo: 81, html: "<p>Повернувся до режиму. Медитація + вода — база.</p>" },
  { daysAgo: 95, html: "<p>Перший тиждень трекера. Цікаво, що з цього вийде.</p>" },
];

// Короткі нотатки-настрою для днів без «великого» запису (частина днів лишається без notes).
const SHORT_NOTES = [
  "<p>Робочий день, нічого особливого.</p>",
  "<p>Втомився, але зробив базу.</p>",
  "<p>Гарний спокійний день.</p>",
  "<p>Багато справ, мало сну.</p>",
  "<p>Продуктивно!</p>",
];

async function main() {
  // ── 1. Повне видалення старого акаунта (каскад прибирає habits/entries/logs/tasks/prefs/AI) ──
  const existing = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
    console.log(`🗑  Видалено попереднього користувача ${TEST_EMAIL} (з усіма даними).`);
  }

  const user = await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      name: TEST_NAME,
      passwordHash: await bcrypt.hash(TEST_PASSWORD, 12),
      createdAt: new Date(`${addDaysISO(TODAY, -HISTORY_DAYS)}T08:00:00.000Z`),
    },
  });

  // Преференції: AI ще НЕ увімкнений — щоб пройти екран згоди вживу.
  await prisma.userPreferences.create({
    data: { userId: user.id, locale: "uk", theme: "dark", tableLayout: "columns", statsGoalPct: 80 },
  });

  const createdAt = new Date(`${addDaysISO(TODAY, -HISTORY_DAYS)}T08:00:00.000Z`);
  const days = Array.from({ length: HISTORY_DAYS + 1 }, (_, i) => addDaysISO(TODAY, -(HISTORY_DAYS - i)));

  // ── 2. Навички ─────────────────────────────────────────────────────────────────────────
  const habitIds = new Map<string, string>();
  for (const p of PROFILES) {
    const habit = await prisma.habit.create({
      data: {
        userId: user.id,
        name: p.name,
        color: p.color,
        icon: p.icon,
        weeklyTarget: p.kind === "count" ? p.weeklyTarget : null,
        weeklyMinutesTarget: p.kind === "timed" ? p.weeklyMinutesTargetHours * 60 : null,
        createdAt,
      },
    });
    habitIds.set(p.name, habit.id);
  }

  // ── 3. Відмітки ────────────────────────────────────────────────────────────────────────
  // doneByName: назва → Set дат (потрібно для синергії — Зарядка залежить від Залу).
  const doneByName = new Map<string, Set<string>>(PROFILES.map((p) => [p.name, new Set<string>()]));
  const minutesByKey = new Map<string, number>(); // `${name}|${date}` → хвилини
  const rng = makeRng(20260904);

  // Спершу count-навички (Зал) — від них залежить синергія.
  for (const p of PROFILES) {
    if (p.kind !== "count") continue;
    const weeksBack = Math.floor(HISTORY_DAYS / 7);
    for (let k = weeksBack; k >= 0; k--) {
      const weekMonday = addDaysISO(THIS_MONDAY, -k * 7);
      for (const offset of p.weekDone(k)) {
        const date = addDaysISO(weekMonday, offset);
        if (date > TODAY || date < days[0]) continue;
        doneByName.get(p.name)!.add(date);
      }
    }
  }

  // Часові навички.
  for (const p of PROFILES) {
    if (p.kind !== "timed") continue;
    for (const date of days) {
      const k = Math.floor((Date.UTC(...parts(TODAY)) - Date.UTC(...parts(date))) / 604_800_000);
      const minutes = p.minutesFor(dowMon0(date), k, rng);
      if (minutes > 0) {
        doneByName.get(p.name)!.add(date);
        minutesByKey.set(`${p.name}|${date}`, minutes);
      }
    }
  }

  // Щоденні навички (враховують тренд, обірваний стрік і синергію).
  for (const p of PROFILES) {
    if (p.kind !== "daily") continue;
    const brokeFrom = p.brokenStreak ? addDaysISO(TODAY, -p.brokenStreak.brokeDaysAgo) : null;
    const runFrom = p.brokenStreak
      ? addDaysISO(brokeFrom!, -p.brokenStreak.runDays)
      : null;

    for (let i = 0; i < days.length; i++) {
      const date = days[i];
      // Обірваний стрік: суцільний run, потім повна тишина до сьогодні.
      if (p.brokenStreak) {
        if (date >= brokeFrom!) continue; // після обриву — нічого
        if (date >= runFrom! && date < brokeFrom!) {
          doneByName.get(p.name)!.add(date);
          continue;
        }
      }
      // Синергія: у дні «якірної» навички — різко вища ймовірність.
      if (p.synergyWith && doneByName.get(p.synergyWith)?.has(date)) {
        if (rng() < (p.synergyRate ?? 0.9)) doneByName.get(p.name)!.add(date);
        continue;
      }
      // Базова ймовірність + тренд по періоду + легка «вихідна» варіація (для weekday-інсайтів).
      const progress = i / (days.length - 1);
      const dow = dowMon0(date);
      const weekendBonus = dow >= 5 ? 0.08 : dow <= 1 ? -0.06 : 0;
      const prob = p.rate + (p.trend ?? 0) * (progress - 0.5) * 2 + weekendBonus;
      if (rng() < prob) doneByName.get(p.name)!.add(date);
    }
  }

  const entries: { habitId: string; date: string; done: boolean; minutes: number | null }[] = [];
  for (const p of PROFILES) {
    const id = habitIds.get(p.name)!;
    for (const date of doneByName.get(p.name)!) {
      entries.push({
        habitId: id,
        date,
        done: true,
        minutes: p.kind === "timed" ? (minutesByKey.get(`${p.name}|${date}`) ?? null) : null,
      });
    }
  }
  await prisma.habitEntry.createMany({ data: entries });

  // ── 4. Настрій + нотатки ───────────────────────────────────────────────────────────────
  const diaryByDate = new Map(DIARY.map((d) => [addDaysISO(TODAY, -d.daysAgo), d.html]));
  const moodDays = days.slice(-MOOD_DAYS);
  const logs: { userId: string; date: string; mood: number; notes: string | null }[] = [];

  for (const date of moodDays) {
    const isLowStreak = date >= addDaysISO(TODAY, -2); // останні 3 дні → інсайт lowMoodStreak
    const hasDiary = diaryByDate.has(date);
    if (!isLowStreak && !hasDiary && rng() > MOOD_LOG_RATE) continue; // частина днів без оцінки

    let mood: number;
    if (isLowStreak) {
      mood = date === TODAY ? 1 : 2; // 2, 2, 1 — три дні поспіль ≤2
    } else {
      // База + внесок виконаних навичок + вихідні трохи краще (weekday-інсайти).
      // Калібровано так, щоб середній був ~3.5 і зустрічались ВСІ рівні 1..5 (інакше heatmap і
      // пікер настрою не покажуть крайніх). Сума moodBoost по всіх навичках ≈ 3.7 → множник 0.38
      // дає максимум ≈ 2.8 + 1.4 + 0.35 + шум ⇒ окремі дні дотягують до 5.
      let score = 2.8 + (dowMon0(date) >= 5 ? 0.35 : dowMon0(date) <= 1 ? -0.2 : 0);
      for (const p of PROFILES) if (doneByName.get(p.name)!.has(date)) score += p.moodBoost * 0.38;
      score += (rng() - 0.5) * 1.2; // шум
      mood = Math.max(1, Math.min(5, Math.round(score)));
    }

    const notes = hasDiary
      ? diaryByDate.get(date)!
      : rng() < 0.25
        ? SHORT_NOTES[Math.floor(rng() * SHORT_NOTES.length)]
        : null;
    logs.push({ userId: user.id, date, mood, notes });
  }
  await prisma.dailyLog.createMany({ data: logs });

  // ── 5. Задачі Planner ──────────────────────────────────────────────────────────────────
  const gymId = habitIds.get("Зал")!;
  const engId = habitIds.get("Англійська")!;
  await prisma.task.createMany({
    data: [
      // Сьогодні — розпорядок (із часом) + список справ (без часу)
      { userId: user.id, date: TODAY, title: "Ранкова зарядка", startTime: "07:00", endTime: "07:30", habitId: null, done: true },
      { userId: user.id, date: TODAY, title: "Англійська — урок", startTime: "10:00", endTime: "11:00", habitId: engId, done: false },
      { userId: user.id, date: TODAY, title: "Купити продукти", startTime: null, endTime: null, habitId: null, done: false },
      { userId: user.id, date: TODAY, title: "Зал", startTime: "19:00", endTime: "20:30", habitId: gymId, done: false },
      // Завтра
      { userId: user.id, date: addDaysISO(TODAY, 1), title: "Прибрати квартиру", startTime: null, endTime: null, habitId: null, done: false },
      // «Загальна» картка — без дати
      { userId: user.id, date: null, title: "Записатися до стоматолога", startTime: null, endTime: null, habitId: null, done: false },
      { userId: user.id, date: null, title: "Оновити резюме", startTime: null, endTime: null, habitId: null, done: false },
      // Минуле → таб «Архів»
      { userId: user.id, date: addDaysISO(TODAY, -3), title: "Дзвінок з командою", startTime: "14:00", endTime: "15:00", habitId: null, done: true },
      { userId: user.id, date: addDaysISO(TODAY, -7), title: "Здати звіт", startTime: null, endTime: null, habitId: null, done: true },
    ],
  });

  // ── 6. Звіт: що саме має спрацювати (для перевірки проти реальних ендпоінтів) ──────────
  const gymThisWeek = [...doneByName.get("Зал")!].filter((d) => d >= THIS_MONDAY).length;
  const medStreakNow = doneByName.get("Медитація")!.has(TODAY) ? "активний" : "0 (обірваний)";
  const timedTotals = PROFILES.filter((p) => p.kind === "timed").map((p) => {
    const mins = [...doneByName.get(p.name)!].reduce(
      (s, d) => s + (minutesByKey.get(`${p.name}|${d}`) ?? 0),
      0,
    );
    return `${p.name}: ${(mins / 60).toFixed(1)} год`;
  });

  console.log(`
✅ Акаунт створено
   email:    ${TEST_EMAIL}
   password: ${TEST_PASSWORD}
   локаль uk, тема dark, ціль виконання 80%, AI — ВИКЛЮЧЕНО (щоб пройти екран згоди)

📊 Наповнення
   навичок:      ${PROFILES.length} (4 щоденні, 2 count, 2 часові)
   відміток:     ${entries.length} за ${HISTORY_DAYS} днів
   днів настрою: ${logs.length} (з них ${logs.filter((l) => l.notes).length} з нотаткою)
   записів щоденника (великих): ${DIARY.length}
   задач:        9
   сумарний час: ${timedTotals.join(", ")}

🔔 Очікувані інсайти GET /ai/insights?today=${TODAY}
   • lowMoodStreak (care)  — настрій 2, 2, 1 за останні 3 дні
   • streakBroken (notice) — Медитація: стрік 14 днів обірвано 6 днів тому, зараз ${medStreakNow}
   • weeklyTargetAtRisk    — Зал: 3×/тиждень, цього тижня ${gymThisWeek}, лишилось днів: ${DAYS_LEFT_IN_WEEK}
   • synergyFound (info)   — Зал → Зарядка (≈90% проти базових ~45%)
   Ендпоінт віддає максимум 2 (сортування care > notice > info) — тобто lowMoodStreak + один notice.
   НЕ спрацюють (взаємовиключні з реалістичним набором): comeback (нема 7-денної паузи —
   щоденні навички активні), perfectWeek (останні дні свідомо «просілі»).
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
