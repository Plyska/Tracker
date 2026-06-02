import { useMemo, useRef, type PointerEvent } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { ListChecks } from "lucide-react";
import { HabitGlyph } from "@/entities/habit";
import { AddHabitButton, HabitRowMenu } from "@/features/manage-habits";
import {
  HABIT_COL_MAX,
  HABIT_COL_MIN,
  setHabitColWidth,
} from "@/features/ui-prefs";
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

const GRID_COLS =
  "grid-cols-[minmax(160px,1.6fr)_repeat(7,minmax(46px,1fr))] " +
  "md:grid-cols-[minmax(184px,1.84fr)_repeat(7,minmax(46px,1fr))]";

export function HabitTable() {
  const { t, i18n } = useTranslation();
  const habits = useAppSelector((s) => s.habits.items);
  const byKey = useAppSelector((s) => s.entries.byKey);
  // Ручна ширина колонки назви (персиститься). null → адаптивний дефолт (GRID_COLS).
  const colWidth = useAppSelector((s) => s.uiPrefs.habitColWidth);
  const dispatch = useAppDispatch();

  const dateLocale = getDateFnsLocale(i18n.language);
  // Поточний тиждень. Навігація по періодах — Фаза 5.
  const week = useMemo(() => getWeekDays(new Date()), []);

  const headerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  const clamp = (w: number) => Math.min(HABIT_COL_MAX, Math.max(HABIT_COL_MIN, w));
  const currentWidth = () =>
    colWidth ?? headerRef.current?.getBoundingClientRect().width ?? HABIT_COL_MIN;

  const onResizeStart = (e: PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: e.clientX, startW: currentWidth() };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dispatch(
      setHabitColWidth(
        clamp(dragRef.current.startW + (e.clientX - dragRef.current.startX)),
      ),
    );
  };
  const onResizeEnd = (e: PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

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
      <div
        className={cn("grid w-full", colWidth === null && GRID_COLS)}
        style={
          colWidth !== null
            ? {
                gridTemplateColumns: `${colWidth}px repeat(7, minmax(46px, 1fr))`,
              }
            : undefined
        }
      >
        {/* --- Рядок заголовка --- */}
        <div
          ref={headerRef}
          className="sticky left-0 top-0 z-20 flex items-center border-b border-border bg-muted px-4 py-3 text-sm font-semibold"
        >
          {t("habits.columnTitle")}
          {/* Перетягуваний роздільник ширини колонки. Подвійний клік — скидання. */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t("habits.resizeColumn")}
            tabIndex={0}
            onPointerDown={onResizeStart}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeEnd}
            onDoubleClick={() => dispatch(setHabitColWidth(null))}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft")
                dispatch(setHabitColWidth(clamp(currentWidth() - 16)));
              else if (e.key === "ArrowRight")
                dispatch(setHabitColWidth(clamp(currentWidth() + 16)));
            }}
            className="group absolute -right-1 top-0 z-30 flex h-full w-2 cursor-col-resize touch-none items-stretch outline-none"
          >
            <span className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-primary opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-100" />
          </div>
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
