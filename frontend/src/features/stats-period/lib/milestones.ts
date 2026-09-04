import type { Habit } from "@/entities/habit";
import type { DailyStat, Stats } from "@/entities/stats";

export type MilestoneKind =
  | "newRecord"
  | "streak"
  | "almostRecord"
  | "perfectWeek"
  | "comeback"
  | "perfectDays";

export interface Milestone {
  id: string;
  kind: MilestoneKind;
  habitName?: string;
  current: number;
  target?: number; // рекорд / наступний поріг / 7 для тижня
  remaining?: number; // скільки лишилось до target
  badge?: number; // досягнутий поріг серії (для streak)
  achieved?: boolean; // ціль уже виконано (ідеальний тиждень)
  daysOff?: number; // днів паузи перед поверненням (comeback)
  unit?: "day" | "week"; // одиниця серії: щоденна звичка → дні; тижнева ціль → тижні
}

// Пороги серій — окремі для щоденних (у днях) і тижневих цілей (у тижнях: місяць/квартал/півроку/рік).
const RECORD_MIN = 5; // мін. довжина серії, щоб вважати рекордом (днів)
const NEAR_RECORD = 7; // «майже рекорд», якщо до нього ≤ стільки днів
const STREAK_BADGES = [7, 30, 100, 200, 365]; // абсолютні віхи серії (днів)
const RECORD_MIN_WEEKS = 3;
const NEAR_RECORD_WEEKS = 3;
const STREAK_BADGES_WEEKS = [4, 12, 26, 52];
const PERFECT_MILESTONES = [7, 14, 30, 50, 100, 150, 200, 300, 365, 500, 730, 1000];
const PERFECT_WEEK = 7;
const COMEBACK_MAX_RUN = 3; // «щойно повернувся» — коротка нова серія…
const COMEBACK_MIN_GAP = 3; // …після паузи ≥ стільки днів
const CAP = 8; // решту (якщо більше) ховає внутрішній скрол віджета

const isPerfect = (d: DailyStat) => d.total > 0 && d.completed === d.total;
const isActive = (d: DailyStat) => d.completed >= 1;

/** Trailing-серія днів, що задовольняють `pred` (з грейсом на «сьогодні», як у streak-метриках). */
function trailingRun(daily: DailyStat[], pred: (d: DailyStat) => boolean): number {
  const arr = daily.length && !pred(daily[daily.length - 1]) ? daily.slice(0, -1) : daily;
  let run = 0;
  for (let i = arr.length - 1; i >= 0 && pred(arr[i]); i--) run++;
  return run;
}

/** Поточна активна серія + пауза перед нею (для «камбек»). */
function activeRunAndGap(daily: DailyStat[]): { run: number; gap: number } {
  const arr = daily.length && !isActive(daily[daily.length - 1]) ? daily.slice(0, -1) : daily;
  let i = arr.length - 1;
  let run = 0;
  while (i >= 0 && isActive(arr[i])) {
    run++;
    i--;
  }
  let gap = 0;
  while (i >= 0 && !isActive(arr[i])) {
    gap++;
    i--;
  }
  return { run, gap };
}

/**
 * Досягнення/рекорди з наявної статистики (per-habit серії + `daily` + perfectDays) — без бекенду.
 * Кожна звичка потрапляє щонайбільше в одну «серійну» категорію (рекорд / майже / бейдж).
 * Пріоритет: нові рекорди → ідеальний тиждень (виконано) → бейджі серій → камбек → майже рекорд →
 * прогрес ідеального тижня → наступна віха ідеальних днів. Понад CAP — ховає внутрішній скрол.
 */
export function buildMilestones(stats: Stats, habits: Habit[]): Milestone[] {
  const nameOf = (id: string) => habits.find((h) => h.id === id)?.name ?? "—";

  // Тижневі за природою — count-ціль (weeklyTarget) І часові (weeklyMinutesTarget): серія в тижнях.
  const weeklyById = new Map(
    habits.map((h) => [h.id, h.weeklyTarget != null || h.weeklyMinutesTarget != null]),
  );

  const newRecords: Milestone[] = [];
  const streaks: Milestone[] = [];
  const almost: Milestone[] = [];
  for (const s of stats.habitStreaks) {
    if (s.current <= 0) continue;
    // Тижнева ціль → серія рахується в тижнях, тож і пороги/підписи тижневі.
    const isWeekly = weeklyById.get(s.habitId) ?? false;
    const unit: Milestone["unit"] = isWeekly ? "week" : "day";
    const recordMin = isWeekly ? RECORD_MIN_WEEKS : RECORD_MIN;
    const nearRecord = isWeekly ? NEAR_RECORD_WEEKS : NEAR_RECORD;
    const badges = isWeekly ? STREAK_BADGES_WEEKS : STREAK_BADGES;

    if (s.current >= s.longest && s.current >= recordMin) {
      newRecords.push({
        id: `nr-${s.habitId}`,
        kind: "newRecord",
        habitName: nameOf(s.habitId),
        current: s.current,
        unit,
      });
    } else if (s.longest >= recordMin && s.longest - s.current <= nearRecord) {
      almost.push({
        id: `ar-${s.habitId}`,
        kind: "almostRecord",
        habitName: nameOf(s.habitId),
        current: s.current,
        target: s.longest,
        remaining: s.longest - s.current,
        unit,
      });
    } else {
      const badge = [...badges].reverse().find((b) => s.current >= b);
      if (badge != null) {
        const next = badges.find((b) => b > s.current);
        streaks.push({
          id: `st-${s.habitId}`,
          kind: "streak",
          habitName: nameOf(s.habitId),
          current: s.current,
          badge,
          target: next,
          remaining: next != null ? next - s.current : undefined,
          unit,
        });
      }
    }
  }
  newRecords.sort((a, b) => b.current - a.current);
  streaks.sort((a, b) => b.current - a.current);
  almost.sort((a, b) => (a.remaining ?? 0) - (b.remaining ?? 0));

  // Ідеальний тиждень: поточна серія ідеальних днів поспіль.
  const perfectRun = trailingRun(stats.daily, isPerfect);
  const perfectWeekDone: Milestone[] =
    perfectRun >= PERFECT_WEEK
      ? [{ id: "pw", kind: "perfectWeek", current: perfectRun, target: PERFECT_WEEK, achieved: true }]
      : [];
  const perfectWeekProgress: Milestone[] =
    perfectRun >= 2 && perfectRun < PERFECT_WEEK
      ? [
          {
            id: "pw",
            kind: "perfectWeek",
            current: perfectRun,
            target: PERFECT_WEEK,
            remaining: PERFECT_WEEK - perfectRun,
          },
        ]
      : [];

  // Камбек: коротка нова активна серія після помітної паузи.
  const { run, gap } = activeRunAndGap(stats.daily);
  const comeback: Milestone[] =
    run >= 1 && run <= COMEBACK_MAX_RUN && gap >= COMEBACK_MIN_GAP
      ? [{ id: "cb", kind: "comeback", current: run, daysOff: gap }]
      : [];

  // Наступна віха накопичених ідеальних днів.
  const nextPerfect = PERFECT_MILESTONES.find((m) => m > stats.perfectDays);
  const perfectDays: Milestone[] = nextPerfect
    ? [
        {
          id: "pd",
          kind: "perfectDays",
          current: stats.perfectDays,
          target: nextPerfect,
          remaining: nextPerfect - stats.perfectDays,
        },
      ]
    : [];

  return [
    ...newRecords,
    ...perfectWeekDone,
    ...streaks,
    ...comeback,
    ...almost,
    ...perfectWeekProgress,
    ...perfectDays,
  ].slice(0, CAP);
}
