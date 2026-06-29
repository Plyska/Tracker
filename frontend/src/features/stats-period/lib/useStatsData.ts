import { useAppSelector } from "@/app/store/hooks";
import { useGetHabitsQuery, type Habit } from "@/entities/habit";
import { useGetStatsQuery, type Stats } from "@/entities/stats";
import { getStatsRange } from "./range";
import type { StatsScale } from "../model/statsPeriodSlice";

/**
 * Єдина точка отримання статистики для віджетів. Читає масштаб+фільтр зі слайса,
 * рахує діапазон (з урахуванням найранішої навички для `all`) і запитує `/stats`.
 * RTK Query дедуплікує однакові args → кілька віджетів з однаковим масштабом = 1 запит.
 *
 * `scaleOverride` — для віджетів із фіксованим масштабом (heatmap завжди «рік»).
 */
export function useStatsData(scaleOverride?: StatsScale): {
  stats: Stats | undefined;
  isLoading: boolean;
  isFetching: boolean;
  habits: Habit[];
  habitId: string | null;
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

  return {
    stats: data,
    isLoading,
    isFetching,
    habits,
    habitId,
    key: `${scale}:${habitId ?? "all"}`,
  };
}
