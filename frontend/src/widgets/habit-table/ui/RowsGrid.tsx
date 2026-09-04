import { format } from "date-fns";
import type { Locale } from "date-fns";
import { ChevronDown } from "lucide-react";
import { HabitGlyph, type Habit } from "@/entities/habit";
import type { HabitEntry } from "@/entities/habit-entry";
import { HabitRowMenu } from "@/features/manage-habits";
import {
  cn,
  entryKey,
  isCurrentWeek,
  isFutureDay,
  isToday,
  isWeekend,
  toISODate,
} from "@/shared/lib";
import { CheckboxCell } from "./CheckboxCell";
import { TimeCell } from "./TimeCell";
import { HabitWeekBadge } from "./HabitWeekBadge";
import { SkeletonCell } from "./skeleton";
import { BOUND_HEIGHT_CLASS } from "./styles";
import { countDoneInDays, sumMinutesInDays } from "../lib/weekProgress";

type Props = {
  habits: Habit[];
  days: Date[];
  byKey: Record<string, HabitEntry | undefined>;
  dateLocale: Locale;
  /** Обмежити висоту → скрол усередині таблиці (sticky-шапка чіпляється до неї). */
  boundHeight?: boolean;
  /** Завантаження відміток періоду → скелетон-клітинки замість галочок. */
  loading?: boolean;
  /** Тижневий масштаб → показати бейдж прогресу тижневої цілі (days = поточний Пн–Нд-тиждень). */
  showWeekBadge?: boolean;
};

/**
 * Транспонована (rows) орієнтація таблиці: дні — в рядках, навички — в колонках.
 * Працює і для тижня (7 рядків), і для місяця (усі дні). Вертикальний скрол
 * (природний на мобільному); sticky-заголовок з навичками і sticky-колонка дат.
 * Альтернатива до колонкової сітки в `HabitTable`.
 */
export function RowsGrid({
  habits,
  days,
  byKey,
  dateLocale,
  boundHeight,
  loading,
  showWeekBadge,
}: Props) {
  return (
    <div
      className={cn(
        "no-scrollbar overflow-auto rounded-xl border border-border bg-card shadow-card",
        boundHeight && BOUND_HEIGHT_CLASS,
      )}
    >
      <div
        className="grid w-max min-w-full"
        style={{
          gridTemplateColumns: `5.5rem repeat(${habits.length}, minmax(60px, 1fr))`,
        }}
      >
        {/* --- Рядок заголовка: порожня кутова клітинка + навички-колонки --- */}
        <div className="sticky left-0 top-0 z-30 border-b border-border bg-muted px-3 py-2" />
        {habits.map((habit) => (
          <div
            key={habit.id}
            className="sticky top-0 z-20 border-b border-l border-border bg-muted"
          >
            {/* Уся шапка колонки = тригер меню (edit/delete) — паритет із columns-виглядом. */}
            <HabitRowMenu
              habit={habit}
              trigger={
                <button
                  type="button"
                  aria-label={habit.name}
                  className={cn(
                    "group flex w-full flex-col items-center gap-1 px-1 py-2 outline-none transition-colors",
                    "hover:bg-accent/50 focus-visible:bg-accent/60 data-[state=open]:bg-accent/60",
                  )}
                >
                  <HabitGlyph
                    name={habit.name}
                    color={habit.color}
                    icon={habit.icon}
                    className="h-7 w-7"
                    iconClassName="h-4 w-4"
                  />
                  <span className="flex w-full items-center justify-center">
                    <span className="max-w-full truncate text-xs font-medium">
                      {habit.name}
                    </span>
                    {/* Відʼємний margin → стрілка не зміщує центрування тексту, лише прилягає праворуч. */}
                    <ChevronDown className="-mr-3.5 ml-0.5 h-3 w-3 shrink-0 text-muted-foreground opacity-60 transition-transform group-data-[state=open]:rotate-180" />
                  </span>
                  {showWeekBadge && habit.weeklyTarget != null && (
                    <HabitWeekBadge
                      current={countDoneInDays(habit.id, days, byKey)}
                      target={habit.weeklyTarget}
                    />
                  )}
                  {showWeekBadge && habit.weeklyMinutesTarget != null && (
                    <HabitWeekBadge
                      current={sumMinutesInDays(habit.id, days, byKey)}
                      target={habit.weeklyMinutesTarget}
                      hours
                    />
                  )}
                </button>
              }
            />
          </div>
        ))}

        {/* --- Рядки днів --- */}
        {days.map((day) => {
          const today = isToday(day);
          const future = isFutureDay(day);
          // Редаговний лише поточний тиждень; майбутні дні заблоковані.
          const outsideWeek = !isCurrentWeek(day);
          const weekend = isWeekend(day);
          const date = toISODate(day);
          return (
            <div key={day.toISOString()} className="contents">
              <div
                className={cn(
                  "sticky left-0 z-10 flex items-baseline gap-1.5 border-b border-border bg-card px-3 py-2 text-sm tabular-nums",
                  today && "font-semibold text-primary",
                  !today && weekend && "text-muted-foreground/70",
                )}
              >
                <span className="text-xs uppercase text-muted-foreground">
                  {format(day, "EEEEEE", { locale: dateLocale })}
                </span>
                <span>{format(day, "d", { locale: dateLocale })}</span>
              </div>
              {habits.map((habit) => {
                const entry = byKey[entryKey(habit.id, date)];
                const isTimed = habit.weeklyMinutesTarget != null;
                // Заблоковано: майбутнє та будь-який день поза поточним тижнем. Див. HabitTable.
                const cellDisabled = future || outsideWeek;
                const cellLabel = `${habit.name} — ${format(day, "PP", { locale: dateLocale })}`;
                return (
                  <div
                    key={habit.id}
                    className={cn(
                      "flex items-center justify-center border-b border-l border-border",
                      today && "bg-accent/60",
                    )}
                  >
                    {loading ? (
                      <SkeletonCell />
                    ) : isTimed ? (
                      <TimeCell
                        habitId={habit.id}
                        date={date}
                        minutes={entry?.minutes ?? 0}
                        color={habit.color}
                        disabled={cellDisabled}
                        label={cellLabel}
                      />
                    ) : (
                      <CheckboxCell
                        habitId={habit.id}
                        date={date}
                        done={entry?.done ?? false}
                        color={habit.color}
                        disabled={cellDisabled}
                        label={cellLabel}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
