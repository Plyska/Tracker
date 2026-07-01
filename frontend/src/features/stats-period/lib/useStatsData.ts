import { skipToken } from "@reduxjs/toolkit/query";
import { useAppSelector } from "@/app/store/hooks";
import { useGetHabitsQuery, type Habit } from "@/entities/habit";
import { useGetStatsQuery, type Stats } from "@/entities/stats";
import { getPreviousStatsRange, getStatsRange } from "./range";
import { buildComparison, type StatsComparison } from "./comparison";
import type { StatsScale } from "../model/statsPeriodSlice";

interface UseStatsDataOptions {
  /**
   * Дотягнути попереднє rolling-вікно й порахувати `comparison`. Default `false`, щоб віджети без
   * порівняння (Heatmap/ActivityChart) не кидали зайвий запит. RTK Query дедуплікує однакові args,
   * тож кілька віджетів із withComparison = 1 prev-запит.
   */
  withComparison?: boolean;
}

/**
 * Єдина точка отримання статистики для віджетів. Читає масштаб+фільтр зі слайса,
 * рахує діапазон (з урахуванням найранішої навички для `all`) і запитує `/stats`.
 * RTK Query дедуплікує однакові args → кілька віджетів з однаковим масштабом = 1 запит.
 *
 * `scaleOverride` — для віджетів із фіксованим масштабом (heatmap завжди «рік»).
 */
export function useStatsData(
  scaleOverride?: StatsScale,
  opts?: UseStatsDataOptions,
): {
  stats: Stats | undefined;
  isLoading: boolean;
  isFetching: boolean;
  habits: Habit[];
  habitId: string | null;
  /** Дані попереднього вікна (лише коли withComparison і scale ≠ "all"). */
  prev: Stats | undefined;
  /** Дельти vs попередній період (null, коли withComparison не запитано). */
  comparison: StatsComparison | null;
  /** Стабільний ключ запиту (`scale:habitId`) — для re-анімації віджетів при зміні фільтра/періоду. */
  key: string;
} {
  const sliceScale = useAppSelector((s) => s.statsPeriod.scale);
  const habitId = useAppSelector((s) => s.statsPeriod.habitId);
  const { data: habits = [] } = useGetHabitsQuery();

  const scale = scaleOverride ?? sliceScale;
  const earliest = habits.length
    ? habits.reduce((min, h) => (h.createdAt < min ? h.createdAt : min), habits[0].createdAt)
    : undefined;
  const range = getStatsRange(scale, earliest);

  const { data, isLoading, isFetching } = useGetStatsQuery({
    ...range,
    habitId: habitId ?? undefined,
  });

  // Попереднє вікно — лише коли явно попросили порівняння (і не «весь час»).
  const prevRange = opts?.withComparison ? getPreviousStatsRange(scale, range) : null;
  const { data: prev } = useGetStatsQuery(
    prevRange ? { ...prevRange, habitId: habitId ?? undefined } : skipToken,
  );

  const comparison =
    opts?.withComparison && data ? buildComparison(data, prev, scale) : null;

  return {
    stats: data,
    isLoading,
    isFetching,
    habits,
    habitId,
    prev,
    comparison,
    key: `${scale}:${habitId ?? "all"}`,
  };
}
