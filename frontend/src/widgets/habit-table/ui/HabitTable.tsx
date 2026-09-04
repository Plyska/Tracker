import { useMemo, useRef, useState, type PointerEvent } from "react";
import { format } from "date-fns";
import { useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { ListChecks, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { HabitGlyph, useGetHabitsQuery } from "@/entities/habit";
import { useGetEntriesQuery, type HabitEntry } from "@/entities/habit-entry";
import { AddHabitButton, HabitRowMenu } from "@/features/manage-habits";
import {
  HABIT_COL_MAX,
  HABIT_COL_MIN,
  setHabitColWidth,
} from "@/features/ui-prefs";
import {
  cn,
  entryKey,
  fromISODate,
  getDateFnsLocale,
  getMonthDays,
  getWeekDays,
  isCurrentWeek,
  isFutureDay,
  isToday,
  isWeekend,
  toISODate,
  useEntitlement,
} from "@/shared/lib";
import { useDelayedFlag } from "@/shared/lib/hooks/useDelayedFlag";
import { CheckboxCell } from "./CheckboxCell";
import { TimeCell } from "./TimeCell";
import { HabitWeekBadge } from "./HabitWeekBadge";
import { RowsGrid } from "./RowsGrid";
import { SkeletonCell, TableSkeleton } from "./skeleton";
import { BOUND_HEIGHT_CLASS } from "./styles";
import { countDoneInDays, sumMinutesInDays } from "../lib/weekProgress";

// Адаптивний дефолт для ТИЖНЯ (7 колонок). Місяць/ручна ширина — через inline-style
// з динамічним repeat(days.length), бо кількість колонок змінна.
// Мобільний: вужча колонка назв (116px), щоб дні-колонки лишали менше горизонтального скролу.
// sm+: колонка назви — `auto` (за вмістом, під найдовшу назву), дні (1fr) заповнюють решту
// ширини. Верхня межа задана max-width на самому span (`max-w-[18rem]`, ~зараз): довші назви
// обрізаються, а не розтягують колонку. Важливо: клітинка назви НЕ використовує flex-1
// (basis:0 колапсує intrinsic-ширину треку) — див. span з `min-w-0 mr-auto truncate` нижче.
const GRID_COLS_SM_UP =
  "sm:grid-cols-[auto_repeat(7,minmax(46px,1fr))] " +
  "md:grid-cols-[auto_repeat(7,minmax(46px,1fr))]";
// Мобільні шаблони: колонка назв — ФІКСОВАНА ширина (px), дні — minmax(0,1fr). Обидва стани
// відрізняються лише шириною 1-ї колонки (60px ↔ 176px) → grid-template-columns інтерполюється,
// тож перехід плавно анімується (inline-transition на сітці). Ширина `w-max min-w-full`:
// згорнуто (вміст < екран) → min-w-full розтягує, 1fr дні заповнюють екран без скролу;
// розгорнуто (176px + дні) → вміст > екран → w-max → гориз. скрол.
const GRID_COLS_MOBILE_EXPANDED =
  "grid-cols-[11rem_repeat(7,minmax(0,1fr))]";
const GRID_COLS_MOBILE_COLLAPSED =
  "grid-cols-[3.75rem_repeat(7,minmax(0,1fr))]";

export function HabitTable() {
  const { t, i18n } = useTranslation();
  // Серверний стан (RTK Query). Навички кешуються окремо від відміток, тож рядки
  // лишаються стабільними при навігації періодом (скелетон — лише на сітці галочок).
  const { data: habits = [], isLoading: habitsLoading } = useGetHabitsQuery();
  // Ручна ширина колонки назви (персиститься). null → адаптивний дефолт (GRID_COLS).
  const colWidth = useAppSelector((s) => s.uiPrefs.habitColWidth);
  // Опорна дата + масштаб — спільні з тулбаром (features/period-navigation).
  const anchor = useAppSelector((s) => s.period.anchor);
  const scale = useAppSelector((s) => s.period.scale);
  // Орієнтація таблиці (columns/rows) — персиститься в ui-prefs, спільна для week/month.
  // `rows` під Pro: без права форсуємо `columns` (persisted-стан міг лишитись від Pro).
  const tableLayout = useAppSelector((s) => s.uiPrefs.tableLayout);
  const canChooseLayout = useEntitlement("table-layout");
  const effectiveLayout = canChooseLayout ? tableLayout : "columns";
  const dispatch = useAppDispatch();

  // Малі екрани: колонка назв за дефолтом згорнута (лише іконки) — тижневу сітку видно цілком
  // без скролу. Кнопка в шапці розгортає її. На sm+ назви показуються завжди (стан ігнорується
  // через `sm:`-класи). Ефемерний стан (скидається при перезавантаженні) — свідомо, це view-тумблер.
  const [namesExpanded, setNamesExpanded] = useState(false);

  // Анімація «виїжджання» колонки (як ширина сайдбару). Inline-transition, бо глобальне
  // правило `* { transition-property: background-color, border-color }` (для зміни теми)
  // перебиває Tailwind-класи transition-*. Поважаємо prefers-reduced-motion.
  const reduce = useReducedMotion();
  const gridAnim = reduce
    ? undefined
    : { transition: "grid-template-columns 200ms ease-in-out" };
  const fadeAnim = reduce ? undefined : { transition: "opacity 200ms ease-in-out" };

  const dateLocale = getDateFnsLocale(i18n.language);
  const days = useMemo(() => {
    const date = fromISODate(anchor);
    return scale === "month" ? getMonthDays(date) : getWeekDays(date);
  }, [anchor, scale]);

  // Відмітки періоду: межі діапазону виводимо з anchor+scale (один endpoint для week/month).
  const from = toISODate(days[0]);
  const to = toISODate(days[days.length - 1]);
  const { data: entries, isLoading: entriesLoading } = useGetEntriesQuery({
    from,
    to,
  });
  const byKey = useMemo(() => {
    const map: Record<string, HabitEntry> = {};
    for (const e of entries ?? []) map[entryKey(e.habitId, e.date)] = e;
    return map;
  }, [entries]);

  // Сітка галочок: скелетон лише коли немає кешу для діапазону (isLoading), із порогом проти
  // мерехтіння. Кешований період (stale-while-revalidate) → isLoading=false → лоадера нема.
  const gridLoading = useDelayedFlag(entriesLoading);

  // Тижневий дефолт (без ручної ширини) → адаптивний клас GRID_COLS; інакше inline-style.
  const useDefaultGrid = colWidth === null && scale === "week";

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

  // Перше завантаження навичок — одразу повний скелетон (навички вантажаться раз за сесію,
  // тож без 150мс-порогу: інакше до спрацювання порогу блимала б порожня таблиця/empty state).
  if (habitsLoading) return <TableSkeleton />;

  if (!habitsLoading && habits.length === 0) {
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

  // Місяць → таблиця отримує власну висоту й скролиться всередині (а не вся сторінка).
  const boundHeight = scale === "month";

  // Rows-орієнтація (тиждень або місяць) — транспонована сітка (дні в рядках).
  if (effectiveLayout === "rows") {
    return (
      <RowsGrid
        habits={habits}
        days={days}
        byKey={byKey}
        dateLocale={dateLocale}
        boundHeight={boundHeight}
        loading={gridLoading}
        showWeekBadge={scale === "week"}
      />
    );
  }

  return (
    <div
      className={cn(
        "no-scrollbar overflow-auto rounded-xl border border-border bg-card shadow-card",
        boundHeight && BOUND_HEIGHT_CLASS,
      )}
    >
      <div
        className={cn(
          "grid min-w-full",
          // Ширина: місяць → w-max. Тиждень: sm+ → w-full (заповнює екран). Мобільний тиждень —
          // згорнуто → w-full (весь тиждень точно влазить), розгорнуто → w-max (широкі назви +
          // гориз. скрол). Перехід колонки анімує inline-transition на grid-template-columns.
          scale === "week"
            ? cn(namesExpanded ? "w-max" : "w-full", "sm:w-full")
            : "w-max",
          // Колонки: на sm+ — контентна колонка назв; на мобільному — згорнута (іконка) чи широка.
          useDefaultGrid &&
            cn(
              namesExpanded
                ? GRID_COLS_MOBILE_EXPANDED
                : GRID_COLS_MOBILE_COLLAPSED,
              GRID_COLS_SM_UP,
            ),
        )}
        style={
          useDefaultGrid
            ? gridAnim
            : {
                gridTemplateColumns: `${
                  colWidth !== null ? `${colWidth}px` : "minmax(160px, 1.6fr)"
                } repeat(${days.length}, ${
                  // Місяць: день-колонки фіксовані й компактні (багато днів → вужчі + гориз.
                  // скрол), не розтягуються. Тиждень (із ручною шириною): заповнюють ширину.
                  scale === "month" ? "minmax(44px, 46px)" : "minmax(46px, 1fr)"
                })`,
              }
        }
      >
        {/* --- Рядок заголовка --- */}
        <div
          ref={headerRef}
          className="sticky left-0 top-0 z-20 flex items-center gap-1 overflow-hidden border-b border-border bg-muted px-4 py-3 text-sm font-semibold sm:overflow-visible"
        >
          {/* Тумблер згортання колонки назв — лише на мобільному (sm+ назви завжди видно). */}
          <button
            type="button"
            onClick={() => setNamesExpanded((v) => !v)}
            aria-label={t(
              namesExpanded ? "habits.collapseNames" : "habits.expandNames",
            )}
            aria-expanded={namesExpanded}
            title={t(namesExpanded ? "habits.collapseNames" : "habits.expandNames")}
            className="-ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
          >
            {namesExpanded ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>
          <span
            style={fadeAnim}
            className={cn(
              "whitespace-nowrap",
              !namesExpanded && "max-sm:opacity-0",
            )}
          >
            {t("habits.columnTitle")}
          </span>
          {/* Перетягуваний роздільник ширини колонки (лише десктоп). Подвійний клік — скидання. */}
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
            className="group absolute -right-1 top-0 z-30 hidden h-full w-2 cursor-col-resize touch-none items-stretch outline-none sm:flex"
          >
            <span className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-primary opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-100" />
          </div>
        </div>
        {days.map((day) => {
          const today = isToday(day);
          const weekend = isWeekend(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "sticky top-0 z-10 flex flex-col items-center gap-0.5 border-b border-l border-border bg-muted px-1 py-2",
                today && "text-primary",
                !today && weekend && "text-muted-foreground/70",
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
            {/* min-h фіксує висоту рядка (= висота кнопки-меню h-8), щоб при згортанні назв
                на мобільному (меню ховається) таблиця не «стрибала» по висоті. */}
            <div className="group sticky left-0 z-10 flex min-h-12.25 min-w-0 items-center gap-2.5 overflow-hidden border-b border-border bg-card px-4 py-2 sm:overflow-visible">
              <HabitGlyph
                name={habit.name}
                color={habit.color}
                icon={habit.icon}
                className="h-7 w-7"
                iconClassName="h-4 w-4"
              />
              <span
                style={fadeAnim}
                className={cn(
                  "mr-auto min-w-0 max-w-[18rem] truncate text-sm font-medium",
                  !namesExpanded && "max-sm:opacity-0",
                )}
              >
                {habit.name}
              </span>
              {/* Бейдж + меню згасають разом із назвою, коли колонку згорнуто на мобільному. */}
              <div
                style={fadeAnim}
                className={cn(
                  "flex items-center gap-2.5",
                  !namesExpanded && "max-sm:opacity-0",
                )}
              >
                {scale === "week" && habit.weeklyTarget != null && (
                  <HabitWeekBadge
                    current={countDoneInDays(habit.id, days, byKey)}
                    target={habit.weeklyTarget}
                  />
                )}
                {scale === "week" && habit.weeklyMinutesTarget != null && (
                  <HabitWeekBadge
                    current={sumMinutesInDays(habit.id, days, byKey)}
                    target={habit.weeklyMinutesTarget}
                    hours
                  />
                )}
                <HabitRowMenu habit={habit} />
              </div>
            </div>
            {days.map((day) => {
              const date = toISODate(day);
              const entry = byKey[entryKey(habit.id, date)];
              const isTimed = habit.weeklyMinutesTarget != null;
              // Редагувати можна лише поточний тиждень: майбутні дні заблоковані,
              // як і будь-який день поза поточним Пн–Нд-тижнем.
              const cellDisabled = isFutureDay(day) || !isCurrentWeek(day);
              const cellLabel = `${habit.name} — ${format(day, "PP", { locale: dateLocale })}`;
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "flex items-center justify-center border-b border-l border-border",
                    isToday(day) && "bg-accent/60",
                  )}
                >
                  {gridLoading ? (
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
        ))}
      </div>
    </div>
  );
}
