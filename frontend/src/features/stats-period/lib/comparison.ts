import type { Stats } from "@/entities/stats";
import type { StatsScale } from "../model/statsPeriodSlice";

/** Дельти поточного періоду проти попереднього (rolling-вікно тієї ж довжини). */
export interface StatsComparison {
  /** false для «весь час» або коли в попередньому вікні не було активних навичок. */
  available: boolean;
  completionRateDelta: number; // current − prev (частки, 0..1)
  perfectDaysDelta: number; // днів
  /** null, якщо в будь-якому з періодів немає залогованого настрою. */
  moodAverageDelta: number | null;
  prev: {
    completionRate: number;
    perfectDays: number;
    moodAverage: number | null;
  };
}

/**
 * Порівняння метрик, прив'язаних до періоду (streak-и — «now»-факти по всій історії, тут не
 * порівнюються). Порівняння недоступне для `all` або коли попереднє вікно порожнє
 * (жодної активної навички → completionRate=0 не несе сенсу).
 */
export function buildComparison(
  current: Stats,
  prev: Stats | undefined,
  scale: StatsScale,
): StatsComparison {
  const available =
    scale !== "all" && !!prev && prev.daily.some((d) => d.total > 0);

  if (!available || !prev) {
    return {
      available: false,
      completionRateDelta: 0,
      perfectDaysDelta: 0,
      moodAverageDelta: null,
      prev: { completionRate: 0, perfectDays: 0, moodAverage: null },
    };
  }

  const moodAverageDelta =
    current.moodAverage != null && prev.moodAverage != null
      ? current.moodAverage - prev.moodAverage
      : null;

  return {
    available: true,
    completionRateDelta: current.completionRate - prev.completionRate,
    perfectDaysDelta: current.perfectDays - prev.perfectDays,
    moodAverageDelta,
    prev: {
      completionRate: prev.completionRate,
      perfectDays: prev.perfectDays,
      moodAverage: prev.moodAverage,
    },
  };
}
