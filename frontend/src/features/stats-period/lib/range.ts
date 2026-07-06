import { addDaysISO, startOfISOWeek, todayISODate } from "@/shared/lib";
import type { StatsScale } from "../model/statsPeriodSlice";

export interface StatsRange {
  from: string; // 'YYYY-MM-DD'
  to: string; // 'YYYY-MM-DD'
}

/**
 * Скільки ЦІЛИХ Пн–Нд-тижнів покриває масштаб (включно з поточним, ще незавершеним, тижнем).
 * Вирівнювання на тижні потрібне, щоб тижневі цілі частоти рахувались точно (ADR 0010): межа
 * періоду завжди на понеділку, тож жоден тиждень не «обрізається» на краю вікна.
 */
const WEEKS_BY_SCALE: Record<Exclude<StatsScale, "all">, number> = {
  week: 1,
  month: 4,
  quarter: 13,
  year: 52,
};

/**
 * Діапазон [from, to] для масштабу. `to` = сьогодні (поточний тиждень рахується «наживо»); `from` =
 * понеділок тижня, з якого стартує вікно. Week = поточний тиждень; Month/Year = N цілих тижнів.
 * `all` — від понеділка тижня найранішої `createdAt` (fallback — рік), щоб покрити всю історію цілими тижнями.
 */
export function getStatsRange(
  scale: StatsScale,
  earliestCreatedAt?: string,
): StatsRange {
  const to = todayISODate();
  const thisMonday = startOfISOWeek(to);
  if (scale === "all") {
    const from = earliestCreatedAt
      ? startOfISOWeek(earliestCreatedAt)
      : startOfISOWeek(addDaysISO(to, -(52 - 1) * 7));
    return { from, to };
  }
  const from = addDaysISO(thisMonday, -(WEEKS_BY_SCALE[scale] - 1) * 7);
  return { from, to };
}

/**
 * Попереднє вікно тієї ж кількості цілих тижнів, що завершується напередодні `current.from`
 * (для «місяця» — 4 тижні перед поточними 4). `current.from` — понеділок, тож попереднє вікно теж
 * вирівняне на тижні (закінчується неділею). Для `all` порівняння не має сенсу → `null`.
 */
export function getPreviousStatsRange(
  scale: StatsScale,
  current: StatsRange,
): StatsRange | null {
  if (scale === "all") return null;
  const weeks = WEEKS_BY_SCALE[scale];
  return {
    from: addDaysISO(current.from, -weeks * 7),
    to: addDaysISO(current.from, -1),
  };
}
