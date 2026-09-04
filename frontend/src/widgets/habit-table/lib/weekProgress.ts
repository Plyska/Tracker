import { entryKey, toISODate } from "@/shared/lib";
import type { HabitEntry } from "@/entities/habit-entry";

/**
 * Скільки разів звичку виконано серед заданих днів — для тижневого бейджа прогресу «N/ціль».
 * У тижневому масштабі `days` = поточний Пн–Нд-тиждень, тож це прогрес тижня до цілі частоти.
 */
export function countDoneInDays(
  habitId: string,
  days: Date[],
  byKey: Record<string, HabitEntry | undefined>,
): number {
  let n = 0;
  for (const day of days) {
    if (byKey[entryKey(habitId, toISODate(day))]?.done) n += 1;
  }
  return n;
}

/**
 * Сума хвилин часової навички серед заданих днів — для тижневого бейджа «Nгод/ціль» (ADR 0011).
 * У тижневому масштабі `days` = поточний Пн–Нд-тиждень, тож це прогрес тижня до хвилинної цілі.
 */
export function sumMinutesInDays(
  habitId: string,
  days: Date[],
  byKey: Record<string, HabitEntry | undefined>,
): number {
  let sum = 0;
  for (const day of days) {
    sum += byKey[entryKey(habitId, toISODate(day))]?.minutes ?? 0;
  }
  return sum;
}
