import { useMemo } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/app/store/hooks";
import { ListChecks } from "lucide-react";
import { HabitGlyph } from "@/entities/habit";
import { AddHabitButton, HabitRowMenu } from "@/features/manage-habits";
import {
  cn,
  entryKey,
  getDateFnsLocale,
  getWeekDays,
  isFutureDay,
  isToday,
  toISODate,
} from "@/shared/lib";
import { CheckboxCell } from "./CheckboxCell";

/** Спільний шаблон колонок: назва навички (sticky) + 7 днів. */
const GRID_COLS = "minmax(160px, 1.6fr) repeat(7, minmax(46px, 1fr))";

export function HabitTable() {
  const { t, i18n } = useTranslation();
  const habits = useAppSelector((s) => s.habits.items);
  const byKey = useAppSelector((s) => s.entries.byKey);

  const dateLocale = getDateFnsLocale(i18n.language);
  // Поточний тиждень. Навігація по періодах — Фаза 5.
  const week = useMemo(() => getWeekDays(new Date()), []);

  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <ListChecks className="h-6 w-6" />
        </span>
        <div className="space-y-1">
          <p className="font-medium">{t("habits.emptyTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("habits.empty")}</p>
        </div>
        <AddHabitButton />
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-xl border border-border bg-card shadow-card">
      <div className="grid w-full" style={{ gridTemplateColumns: GRID_COLS }}>
        {/* --- Рядок заголовка --- */}
        <div className="sticky left-0 top-0 z-20 border-b border-border bg-muted px-4 py-3 text-sm font-semibold">
          {t("habits.columnTitle")}
        </div>
        {week.map((day) => {
          const today = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "sticky top-0 z-10 flex flex-col items-center gap-0.5 border-b border-l border-border bg-muted px-1 py-2",
                today && "text-primary",
              )}
            >
              <span className="text-xs font-medium uppercase">
                {format(day, "EEEEEE", { locale: dateLocale })}
              </span>
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-sm tabular-nums",
                  today && "bg-primary font-semibold text-primary-foreground",
                )}
              >
                {format(day, "d", { locale: dateLocale })}
              </span>
            </div>
          );
        })}

        {/* --- Рядки навичок --- */}
        {habits.map((habit) => (
          <div key={habit.id} className="contents">
            <div className="group sticky left-0 z-10 flex items-center gap-2.5 border-b border-border bg-card px-4 py-2">
              <HabitGlyph
                name={habit.name}
                color={habit.color}
                icon={habit.icon}
                className="h-7 w-7"
                iconClassName="h-4 w-4"
              />
              <span className="flex-1 truncate text-sm font-medium">
                {habit.name}
              </span>
              <HabitRowMenu habit={habit} />
            </div>
            {week.map((day) => {
              const date = toISODate(day);
              const done = byKey[entryKey(habit.id, date)]?.done ?? false;
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "flex items-center justify-center border-b border-l border-border",
                    isToday(day) && "bg-accent/40",
                  )}
                >
                  <CheckboxCell
                    habitId={habit.id}
                    date={date}
                    done={done}
                    color={habit.color}
                    disabled={isFutureDay(day)}
                    label={`${habit.name} — ${format(day, "PP", { locale: dateLocale })}`}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
