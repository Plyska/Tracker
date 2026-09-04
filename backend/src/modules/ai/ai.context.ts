import { prisma } from "../../prisma.js";
import { env } from "../../env.js";
import { computeStats } from "../stats/stats.service.js";
import { htmlToPlainText, stripHtml, truncateText } from "../../lib/html.js";
import type { AiLocale } from "./ai.prompts.js";

/**
 * Контекст-пак: те, що модель бачить про користувача (ADR 0012, план §3.1/§4).
 *
 * Ключове рішення — це **проєкція `computeStats`**, а не сирі рядки БД. Ми вже рахуємо
 * completion/стріки/синергії/кореляції на сервері, тож модель отримує готові ЧИСЛА і має лише
 * підібрати слова. Це втричі дешевше за дампи відміток і, головне, прибирає найгірший режим
 * відмови — «модель сама щось порахувала й помилилась».
 *
 * Порівняння з попереднім вікном (`prev*`) — щоб лист міг сказати «краще/гірше, ніж було»
 * (той самий підхід, що movers на клієнті: другий виклик computeStats).
 *
 * Приватність: щоденник додається ЛИШЕ за `aiDiaryOptIn` (ADR 0012). Текст щоденника —
 * недовірений ввід: у промпті він живе у відмежованому блоці як ДАНІ, не як інструкції.
 */

export type AiPeriod = "week" | "month";

const WEEKS_IN_PERIOD: Record<AiPeriod, number> = { week: 1, month: 4 };
const DIARY_MAX_ENTRIES = 7;
const DIARY_MAX_CHARS = 500;
/** Грубий орієнтир: ~4 символи JSON на токен. Точність тут не потрібна — це лише стеля. */
const CHARS_PER_TOKEN = 4;

// ── date-хелпери (рядкові ISO; ті самі інваріанти, що stats.service) ────────────────────────
const toISO = (d: Date): string => d.toISOString().slice(0, 10);
const parts = (iso: string): [number, number, number] =>
  iso.split("-").map(Number) as [number, number, number];
const addDaysISO = (iso: string, n: number): string => {
  const [y, m, d] = parts(iso);
  return toISO(new Date(Date.UTC(y, m - 1, d + n)));
};
const dowMon0 = (iso: string): number => {
  const [y, m, d] = parts(iso);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
};
const mondayISO = (iso: string): string => addDaysISO(iso, -dowMon0(iso));

/** Номер ISO-тижня (для `periodKey` виду `2026-W36`). */
const isoWeekKey = (iso: string): string => {
  const monday = mondayISO(iso);
  const [y, m, d] = parts(monday);
  const thursday = new Date(Date.UTC(y, m - 1, d + 3)); // четвер визначає рік ISO-тижня
  const isoYear = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const firstMonday = new Date(
    Date.UTC(isoYear, 0, 4 - ((jan4.getUTCDay() + 6) % 7)),
  );
  const week = Math.round((thursday.getTime() - firstMonday.getTime()) / 604_800_000) + 1;
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
};

export interface PeriodBounds {
  kind: AiPeriod;
  from: string;
  to: string;
  /** Стабільний ключ періоду — за ним кешується згенерований лист. */
  key: string;
  prevFrom: string;
  prevTo: string;
}

/**
 * Межі періоду, **вирівняні на Пн–Нд** (ADR 0010): тижнева математика цілей інакше бреше на
 * краях вікна. `week` = поточний тиждень від понеділка до «сьогодні»; `month` = 4 цілі тижні.
 */
export function periodBounds(period: AiPeriod, today: string): PeriodBounds {
  const weeks = WEEKS_IN_PERIOD[period];
  const from = addDaysISO(mondayISO(today), -(weeks - 1) * 7);
  return {
    kind: period,
    from,
    to: today,
    key: period === "week" ? isoWeekKey(today) : today.slice(0, 7),
    prevFrom: addDaysISO(from, -weeks * 7),
    prevTo: addDaysISO(from, -1),
  };
}

type HabitKind = "daily" | "count" | "timed";

export interface ContextPack {
  today: string;
  period: { kind: AiPeriod; from: string; to: string };
  locale: AiLocale;
  /** Модель ОБОВ'ЯЗКОВО копіює `id` звідси у `habitId` результату (валідація в ai.reflection). */
  habits: {
    id: string;
    name: string;
    kind: HabitKind;
    /** count → разів/тиждень; timed → хвилин/тиждень; daily → null. */
    target: number | null;
    completion: number;
    prevCompletion: number | null;
    activeDays: number;
    /** Лише для часових навичок. */
    minutes?: number;
    streak: { current: number; longest: number; unit: "day" | "week" };
  }[];
  /** Денна серія періоду: виконано/усього (щоденні бінарні), настрій, хвилини (часові). */
  days: { date: string; done: number; total: number; mood: number | null; minutes: number }[];
  summary: {
    completion: number;
    prevCompletion: number | null;
    perfectDays: number;
    prevPerfectDays: number | null;
    moodAvg: number | null;
    prevMoodAvg: number | null;
    moodDays: number;
    activeStreak: number;
    longestStreak: number;
  };
  /** Готові патерни з `computeStats` — назвами, щоб модель не звіряла id вручну. */
  patterns: {
    synergies: { habit: string; then: string; ratePct: number; usualPct: number }[];
    moodByHabit: { habit: string; delta: number }[];
    moodVsCompletion: { delta: number } | null;
  };
  /** Присутній ЛИШЕ якщо ввімкнено `aiDiaryOptIn`. Недовірений ввід — у промпті як дані. */
  diary?: { date: string; mood: number | null; text: string }[];
  /** Прапорці для промпту: чого саме бракує (щоб лист не «доповнював» відсутнє). */
  notes: { diaryIncluded: boolean; hasComparison: boolean; sparse: boolean };
}

const kindOf = (h: { weeklyTarget: number | null; weeklyMinutesTarget: number | null }): HabitKind =>
  h.weeklyMinutesTarget != null ? "timed" : h.weeklyTarget != null ? "count" : "daily";

/**
 * Зібрати контекст-пак. Три запити паралельно (навички, логи щоденника, обидва вікна статистики)
 * + обрізка під `AI_CONTEXT_MAX_TOKENS`.
 */
export async function buildContextPack(
  userId: string,
  period: AiPeriod,
  today: string,
  locale: AiLocale,
  diaryOptIn: boolean,
): Promise<{ pack: ContextPack; bounds: PeriodBounds }> {
  const bounds = periodBounds(period, today);

  const [habits, stats, prevStats, diaryLogs] = await Promise.all([
    prisma.habit.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, name: true, weeklyTarget: true, weeklyMinutesTarget: true },
      orderBy: { createdAt: "asc" },
    }),
    computeStats(userId, bounds.from, bounds.to),
    computeStats(userId, bounds.prevFrom, bounds.prevTo),
    diaryOptIn
      ? prisma.dailyLog.findMany({
          where: { userId, notes: { not: null }, date: { gte: bounds.from, lte: bounds.to } },
          orderBy: { date: "desc" },
          take: DIARY_MAX_ENTRIES,
          select: { date: true, mood: true, notes: true },
        })
      : Promise.resolve([]),
  ]);

  const nameOf = new Map(habits.map((h) => [h.id, h.name]));
  const breakdown = new Map(stats.habitBreakdown.map((b) => [b.habitId, b]));
  const prevBreakdown = new Map(prevStats.habitBreakdown.map((b) => [b.habitId, b]));
  const streaks = new Map(stats.habitStreaks.map((s) => [s.habitId, s]));

  // Порівняння має сенс лише коли в попередньому вікні взагалі були дані.
  const hasComparison = prevStats.habitBreakdown.length > 0;

  const packHabits: ContextPack["habits"] = habits
    // Звички без жодної відмітки у періоді в лист не потрапляють — інакше модель почне їх «підбадьорювати».
    .filter((h) => breakdown.has(h.id))
    .map((h) => {
      const b = breakdown.get(h.id)!;
      const kind = kindOf(h);
      const prev = prevBreakdown.get(h.id);
      return {
        id: h.id,
        name: h.name,
        kind,
        target: h.weeklyMinutesTarget ?? h.weeklyTarget ?? null,
        completion: round2(b.completionRate),
        prevCompletion: prev && hasComparison ? round2(prev.completionRate) : null,
        activeDays: b.activeDays,
        ...(kind === "timed" ? { minutes: b.totalMinutes } : {}),
        streak: {
          current: streaks.get(h.id)?.current ?? 0,
          longest: streaks.get(h.id)?.longest ?? 0,
          // Тижневі за природою (count і timed) міряються в ТИЖНЯХ (ADR 0010/0011) — модель
          // мусить це знати, інакше напише «14 днів» там, де насправді 14 тижнів.
          unit: kind === "daily" ? "day" : "week",
        },
      };
    });

  const days: ContextPack["days"] = stats.daily.map((d) => ({
    date: d.date,
    done: d.completed,
    total: d.total,
    mood: d.mood,
    minutes: d.minutes,
  }));

  const patterns: ContextPack["patterns"] = {
    synergies: stats.habitSynergies
      .filter((s) => nameOf.has(s.habitA) && nameOf.has(s.habitB))
      .slice(0, 3)
      .map((s) => ({
        habit: nameOf.get(s.habitA)!,
        then: nameOf.get(s.habitB)!,
        ratePct: Math.round(s.rate * 100),
        usualPct: Math.round(s.baseline * 100),
      })),
    moodByHabit: stats.moodCorrelations
      .filter((c) => nameOf.has(c.habitId))
      .slice(0, 3)
      .map((c) => ({ habit: nameOf.get(c.habitId)!, delta: round2(c.delta) })),
    moodVsCompletion: stats.moodVsCompletion
      ? { delta: round2(stats.moodVsCompletion.delta) }
      : null,
  };

  const diary = diaryLogs
    .filter((l) => l.notes && stripHtml(l.notes).length > 0)
    .map((l) => ({
      date: l.date,
      mood: l.mood,
      text: truncateText(htmlToPlainText(l.notes!), DIARY_MAX_CHARS),
    }));

  const pack: ContextPack = {
    today,
    period: { kind: bounds.kind, from: bounds.from, to: bounds.to },
    locale,
    habits: packHabits,
    days,
    patterns,
    summary: {
      completion: round2(stats.completionRate),
      prevCompletion: hasComparison ? round2(prevStats.completionRate) : null,
      perfectDays: stats.perfectDays,
      prevPerfectDays: hasComparison ? prevStats.perfectDays : null,
      moodAvg: stats.moodAverage != null ? round2(stats.moodAverage) : null,
      prevMoodAvg: prevStats.moodAverage != null ? round2(prevStats.moodAverage) : null,
      moodDays: stats.moodDays,
      activeStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
    },
    ...(diaryOptIn ? { diary } : {}),
    notes: {
      diaryIncluded: diaryOptIn && diary.length > 0,
      hasComparison,
      // «Мало даних» — щоб інструкція веліла сказати це прямо, а не доповнювати лист водою.
      sparse: packHabits.length === 0 || days.filter((d) => d.total > 0).length < 3,
    },
  };

  return { pack: trimToBudget(pack), bounds };
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

const estimateTokens = (pack: ContextPack): number =>
  Math.ceil(JSON.stringify(pack).length / CHARS_PER_TOKEN);

/**
 * Утримати пак у межах `AI_CONTEXT_MAX_TOKENS`. Порядок жертв — від найменш цінного до найбільш:
 * спершу ріжемо щоденник (найдорожчий за токенами), потім прорідж уємо денну серію.
 * Числа зі `summary`/`habits`/`patterns` не чіпаємо — це кістяк листа.
 */
function trimToBudget(pack: ContextPack): ContextPack {
  const budget = env.aiContextMaxTokens;
  if (estimateTokens(pack) <= budget) return pack;

  if (pack.diary?.length) {
    const diary = [...pack.diary];
    while (diary.length > 1 && estimateTokens({ ...pack, diary }) > budget) diary.pop();
    pack = { ...pack, diary, notes: { ...pack.notes, diaryIncluded: diary.length > 0 } };
    if (estimateTokens(pack) <= budget) return pack;
  }

  // Прорідження: лишаємо кожен другий день, але завжди останній тиждень цілком (він найважливіший
  // для листа) — інакше «цього тижня» стане неточним.
  const keepFrom = pack.days.length > 7 ? pack.days.length - 7 : 0;
  const days = pack.days.filter((_, i) => i >= keepFrom || i % 2 === 0);
  return { ...pack, days };
}
