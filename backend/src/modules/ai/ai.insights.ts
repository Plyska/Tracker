import { prisma } from "../../prisma.js";
import { computeStats, mondayISO } from "../stats/stats.service.js";

/**
 * Підказки-патерни (ADR 0012, план §3.4) — БЕЗ LLM.
 *
 * Детерміновані тригери поверх даних, які ми вже рахуємо (`computeStats`, записи, логи настрою).
 * Сервер віддає лише `{key, variant, severity, params, seed}`; ТЕКСТ — i18n-шаблони на клієнті
 * (`ai.insights.<key>.v<variant>`), тож підказка фізично не може «вигадати» цифру.
 * Нічого не надсилається третім сторонам → працює й без згоди на AI.
 *
 * Ролі: підказка — «двері» (помітити й запропонувати), жива мова — у листі тижня/чаті.
 * `variant` ротує формулювання за днем (анти-шаблонність), `severity` впорядковує показ
 * (care > notice > info; клієнт показує 1 картку), `seed` — зачіпка для чату («обговорити»).
 */

export type InsightKey =
  | "lowMoodStreak" // ≥3 дні поспіль настрій ≤2 — м'який чек-ін, не діагноз
  | "comeback" // повернення після паузи ≥7 днів — без осуду
  | "streakBroken" // довга серія (≥7) обірвалась — нормалізувати
  | "weeklyTargetAtRisk" // тижнева ціль недосяжна/на межі до неділі
  | "synergyFound" // «коли робиш A — частіше робиш B» (з computeStats)
  | "perfectWeek"; // 7 ідеальних днів поспіль

export type InsightSeverity = "care" | "notice" | "info";

export interface InsightDto {
  key: InsightKey;
  /** 0..VARIANTS-1 — індекс i18n-формулювання; стабільний протягом дня, різний між днями. */
  variant: number;
  severity: InsightSeverity;
  /** Підстановки в шаблон: назви навичок, числа. Ніяких вільних текстів моделі. */
  params: Record<string, string | number>;
  /** Машинна зачіпка для засівання чату, напр. "lowMoodStreak:3". */
  seed: string;
}

const VARIANTS = 3;
const MAX_INSIGHTS = 2; // клієнт показує 1; друга — на випадок дисмісу
const LOOKBACK_DAYS = 28;
const LOW_MOOD_MAX = 2;
const LOW_MOOD_MIN_DAYS = 3;
// Обірвана серія показується лише якщо вона САМА була змістовною: інакше ми драматизували б
// розрив дводенної серії, посилаючись на давній рекорд («на нулі після 26 днів», хоча щойно
// обірвались 2). Рекорд тепер лише додатковий контекст, а не підмет речення.
const STREAK_BROKEN_MIN_RUN = 5;
const STREAK_BROKEN_MAX_DAYS_AGO = 14; // старіший розрив — уже не новина
const COMEBACK_MIN_GAP_DAYS = 7;
const SYNERGY_MIN_DELTA = 0.2;
const TIMED_AT_RISK_MAX_DAYS_LEFT = 2;

const SEVERITY_RANK: Record<InsightSeverity, number> = { care: 0, notice: 1, info: 2 };

// ── date-хелпери (рядкові ISO, лексикографічно == хронологічно; як у stats.service) ─────────
const toISO = (d: Date): string => d.toISOString().slice(0, 10);
const parts = (iso: string): [number, number, number] =>
  iso.split("-").map(Number) as [number, number, number];
const addDaysISO = (iso: string, n: number): string => {
  const [y, m, d] = parts(iso);
  return toISO(new Date(Date.UTC(y, m - 1, d + n)));
};
const daysBetween = (fromISO: string, toISOStr: string): number => {
  const [y1, m1, d1] = parts(fromISO);
  const [y2, m2, d2] = parts(toISOStr);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
};

// Стабільний за день варіант формулювання: різні дні → різні варіанти, той самий день → той самий.
const variantFor = (key: InsightKey, today: string): number => {
  let h = 0;
  for (const ch of `${today}:${key}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % VARIANTS;
};

interface HabitLite {
  id: string;
  name: string;
  weeklyTarget: number | null;
  weeklyMinutesTarget: number | null;
}

/** Знімок даних для тригерів — один набір запитів, далі чисті функції. */
interface Snapshot {
  today: string;
  habits: HabitLite[];
  nameOf: Map<string, string>;
  /** Дата → настрій (останні 14 днів). */
  moodByDate: Map<string, number>;
  /** Усі дні з ≥1 виконаною навичкою за LOOKBACK_DAYS. */
  activeDates: Set<string>;
  /**
   * habitId → дати виконання за LOOKBACK_DAYS. Потрібне для довжини серії, що обірвалась.
   * Прим.: серія довша за вікно обрізається його межею — для «свіжого розриву» (≤14 днів тому)
   * цього достатньо, а точний рекорд усе одно приходить із `computeStats.habitStreaks`.
   */
  doneByHabit: Map<string, Set<string>>;
  /** Виконання поточного Пн–Нд-тижня по навичці: count і Σ minutes. */
  weekDone: Map<string, { count: number; minutes: number }>;
  stats: Awaited<ReturnType<typeof computeStats>>;
}

async function loadSnapshot(userId: string, today: string): Promise<Snapshot> {
  const from = addDaysISO(today, -(LOOKBACK_DAYS - 1));
  const monday = mondayISO(today);

  const [habits, entries, logs, stats] = await Promise.all([
    prisma.habit.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, name: true, weeklyTarget: true, weeklyMinutesTarget: true },
    }),
    prisma.habitEntry.findMany({
      where: {
        habit: { userId, deletedAt: null },
        done: true,
        date: { gte: from, lte: today },
      },
      select: { habitId: true, date: true, minutes: true },
    }),
    prisma.dailyLog.findMany({
      where: { userId, date: { gte: addDaysISO(today, -13), lte: today } },
      select: { date: true, mood: true },
    }),
    computeStats(userId, from, today),
  ]);

  const activeDates = new Set<string>();
  const doneByHabit = new Map<string, Set<string>>();
  const weekDone = new Map<string, { count: number; minutes: number }>();
  for (const e of entries) {
    activeDates.add(e.date);
    let set = doneByHabit.get(e.habitId);
    if (!set) doneByHabit.set(e.habitId, (set = new Set()));
    set.add(e.date);
    if (e.date >= monday) {
      const w = weekDone.get(e.habitId) ?? { count: 0, minutes: 0 };
      w.count += 1;
      w.minutes += e.minutes ?? 0;
      weekDone.set(e.habitId, w);
    }
  }

  return {
    today,
    habits,
    nameOf: new Map(habits.map((h) => [h.id, h.name])),
    moodByDate: new Map(logs.map((l) => [l.date, l.mood])),
    activeDates,
    doneByHabit,
    weekDone,
    stats,
  };
}

// ── тригери (чисті функції над Snapshot) ─────────────────────────────────────────────────

/** ≥3 дні поспіль (до сьогодні або вчора, якщо сьогодні ще не оцінено) настрій ≤2. */
const lowMoodStreak = (s: Snapshot): InsightDto | null => {
  let cursor = s.moodByDate.has(s.today) ? s.today : addDaysISO(s.today, -1);
  let n = 0;
  while ((s.moodByDate.get(cursor) ?? Infinity) <= LOW_MOOD_MAX) {
    n += 1;
    cursor = addDaysISO(cursor, -1);
  }
  if (n < LOW_MOOD_MIN_DAYS) return null;
  return {
    key: "lowMoodStreak",
    variant: variantFor("lowMoodStreak", s.today),
    severity: "care",
    params: { count: n },
    seed: `lowMoodStreak:${n}`,
  };
};

/** Сьогодні активний після паузи ≥7 днів. */
const comeback = (s: Snapshot): InsightDto | null => {
  if (!s.activeDates.has(s.today)) return null;
  let prev: string | null = null;
  for (const d of s.activeDates) if (d < s.today && (prev === null || d > prev)) prev = d;
  if (prev === null) return null; // перший активний день узагалі — не «повернення»
  const gap = daysBetween(prev, s.today) - 1;
  if (gap < COMEBACK_MIN_GAP_DAYS) return null;
  return {
    key: "comeback",
    variant: variantFor("comeback", s.today),
    severity: "notice",
    params: { days: gap },
    seed: `comeback:${gap}`,
  };
};

/**
 * Змістовна серія щойно обірвалась. Рахуємо ДОВЖИНУ ТІЄЇ серії, що впала, і коли це сталося —
 * а не рекорд за всю історію: `habitStreaks.longest` описує інший факт, і підставляти його в
 * речення про свіжий розрив означало б брехати числом (єдине, чого детермінована підказка
 * робити не має права). Рекорд віддаємо окремим параметром — як контекст.
 */
const streakBroken = (s: Snapshot): InsightDto | null => {
  // ЛИШЕ щоденні звички. У count/часових стрік міряється в ТИЖНЯХ (ADR 0010/0011), тож
  // `current === 0` там означає «не досягнуто тижневої цілі», а не «обірвалась денна серія» —
  // денна арифметика на таких навичках дала б безглузде «серія 5 днів» проти рекорду «4 тижні».
  // Для тижневих потрібен окремий тригер (пропущені тижні поспіль) — свідомо поза цим.
  const dailyIds = new Set(
    s.habits.filter((h) => h.weeklyTarget == null && h.weeklyMinutesTarget == null).map((h) => h.id),
  );
  const candidates = s.stats.habitStreaks
    .filter((h) => h.current === 0 && dailyIds.has(h.habitId) && s.nameOf.has(h.habitId))
    .map((h) => {
      const done = s.doneByHabit.get(h.habitId);
      if (!done?.size) return null;
      // Найновіша відмітка + довжина безперервного відрізка, що на ній закінчується.
      let last = "";
      for (const d of done) if (d > last) last = d;
      let run = 1;
      while (done.has(addDaysISO(last, -run))) run += 1;
      return { habitId: h.habitId, run, daysAgo: daysBetween(last, s.today) };
    })
    .filter(
      (c): c is NonNullable<typeof c> =>
        c !== null && c.run >= STREAK_BROKEN_MIN_RUN && c.daysAgo <= STREAK_BROKEN_MAX_DAYS_AGO,
    )
    // Найсвіжіший розрив важливіший; за рівних — довша обірвана серія.
    .sort((a, b) => a.daysAgo - b.daysAgo || b.run - a.run);

  const broken = candidates[0];
  if (!broken) return null;
  return {
    key: "streakBroken",
    variant: variantFor("streakBroken", s.today),
    severity: "notice",
    // `longest` свідомо НЕ віддаємо: у різних типів навичок його одиниця різна (дні/тижні),
    // і в шаблоні поруч із денним `run` він читався б як те саме — знову брехня числом.
    params: {
      habit: s.nameOf.get(broken.habitId)!,
      run: broken.run,
      daysAgo: broken.daysAgo,
    },
    seed: `streakBroken:${broken.habitId}`,
  };
};

/**
 * Тижнева ціль під загрозою: count — решта > днів до неділі (математично недосяжно);
 * timed — решта > 0, а днів лишилось ≤ 2. Беремо найгіршу за часткою невиконаного.
 */
const weeklyTargetAtRisk = (s: Snapshot): InsightDto | null => {
  const sunday = addDaysISO(mondayISO(s.today), 6);
  const daysLeft = daysBetween(s.today, sunday); // дні ПІСЛЯ сьогодні включно з неділею
  let best: { habit: HabitLite; remaining: number; unit: "times" | "minutes"; ratio: number } | null =
    null;
  for (const h of s.habits) {
    const done = s.weekDone.get(h.id) ?? { count: 0, minutes: 0 };
    if (h.weeklyTarget != null) {
      const remaining = h.weeklyTarget - done.count;
      if (remaining > 0 && remaining > daysLeft) {
        const ratio = remaining / h.weeklyTarget;
        if (!best || ratio > best.ratio) best = { habit: h, remaining, unit: "times", ratio };
      }
    } else if (h.weeklyMinutesTarget != null) {
      const remaining = h.weeklyMinutesTarget - done.minutes;
      if (remaining > 0 && daysLeft <= TIMED_AT_RISK_MAX_DAYS_LEFT) {
        const ratio = remaining / h.weeklyMinutesTarget;
        if (!best || ratio > best.ratio) best = { habit: h, remaining, unit: "minutes", ratio };
      }
    }
  }
  if (!best) return null;
  return {
    key: "weeklyTargetAtRisk",
    variant: variantFor("weeklyTargetAtRisk", s.today),
    severity: "notice",
    params: { habit: best.habit.name, remaining: best.remaining, daysLeft, unit: best.unit },
    seed: `weeklyTargetAtRisk:${best.habit.id}`,
  };
};

/** Найсильніша синергія з computeStats (уже з гейтами вибірки): delta ≥ 0.2. */
const synergyFound = (s: Snapshot): InsightDto | null => {
  const top = s.stats.habitSynergies.find(
    (x) => x.delta >= SYNERGY_MIN_DELTA && s.nameOf.has(x.habitA) && s.nameOf.has(x.habitB),
  );
  if (!top) return null;
  return {
    key: "synergyFound",
    variant: variantFor("synergyFound", s.today),
    severity: "info",
    params: {
      habitA: s.nameOf.get(top.habitA)!,
      habitB: s.nameOf.get(top.habitB)!,
      pct: Math.round(top.rate * 100),
      // Назва мусить збігатися з плейсхолдером у `ai.insights.synergyFound.v*` — інакше i18n
      // мовчки лишає «{{usualPct}}» у тексті. Тут же вона збігається з `ai.context.ts`.
      usualPct: Math.round(top.baseline * 100),
    },
    seed: `synergyFound:${top.habitA}:${top.habitB}`,
  };
};

/** Останні 7 днів — усі ідеальні (виконано ВСІ активні щоденні навички). */
const perfectWeek = (s: Snapshot): InsightDto | null => {
  const last7 = s.stats.daily.slice(-7);
  if (last7.length < 7 || !last7.every((d) => d.total > 0 && d.completed === d.total)) return null;
  return {
    key: "perfectWeek",
    variant: variantFor("perfectWeek", s.today),
    severity: "info",
    params: { days: 7 },
    seed: "perfectWeek",
  };
};

/**
 * Обчислити підказки на «сьогодні» (локальна дата клієнта). Порядок: care > notice > info;
 * `comeback` витісняє `streakBroken` (повернення вже пояснює обрив). Максимум MAX_INSIGHTS.
 */
export async function computeInsights(userId: string, today: string): Promise<InsightDto[]> {
  const s = await loadSnapshot(userId, today);

  const out: InsightDto[] = [];
  const push = (i: InsightDto | null) => i && out.push(i);

  push(lowMoodStreak(s));
  const cb = comeback(s);
  push(cb);
  if (!cb) push(streakBroken(s));
  push(weeklyTargetAtRisk(s));
  push(synergyFound(s));
  push(perfectWeek(s));

  return out
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, MAX_INSIGHTS);
}
