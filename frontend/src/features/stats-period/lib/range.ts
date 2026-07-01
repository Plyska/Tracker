import { addDaysISO, todayISODate } from "@/shared/lib";
import type { StatsScale } from "../model/statsPeriodSlice";

export interface StatsRange {
  from: string; // 'YYYY-MM-DD'
  to: string; // 'YYYY-MM-DD'
}

/** Скільки днів назад покриває масштаб (rolling-вікно, що завершується сьогодні). */
const SPAN_DAYS: Record<Exclude<StatsScale, "all">, number> = {
  week: 7,
  month: 30,
  year: 365,
};

/**
 * Діапазон [from, to] для масштабу. Rolling-вікно до сьогодні (без розбавлення майбутніми днями).
 * `all` — від найранішої `createdAt` серед навичок (fallback — рік), щоб покрити всю історію.
 */
export function getStatsRange(
  scale: StatsScale,
  earliestCreatedAt?: string,
): StatsRange {
  const to = todayISODate();
  if (scale === "all") {
    const from = earliestCreatedAt ?? addDaysISO(to, -(SPAN_DAYS.year - 1));
    return { from, to };
  }
  return { from: addDaysISO(to, -(SPAN_DAYS[scale] - 1)), to };
}

/**
 * Попереднє rolling-вікно тієї ж довжини, що завершується напередодні `current.from`
 * (для «місяця» — 30 днів перед поточними 30). Для `all` порівняння не має сенсу → `null`.
 */
export function getPreviousStatsRange(
  scale: StatsScale,
  current: StatsRange,
): StatsRange | null {
  if (scale === "all") return null;
  const span = SPAN_DAYS[scale];
  return {
    from: addDaysISO(current.from, -span),
    to: addDaysISO(current.from, -1),
  };
}
