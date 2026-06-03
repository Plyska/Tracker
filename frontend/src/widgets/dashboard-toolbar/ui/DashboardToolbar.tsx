import { useMemo } from "react";
import { format } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { AddHabitButton } from "@/features/manage-habits";
import {
  goToToday,
  nextPeriod,
  prevPeriod,
  setScale,
} from "@/features/period-navigation";
import { Button, IconButton } from "@/shared/ui";
import { cn, fromISODate, getDateFnsLocale, getWeekDays } from "@/shared/lib";

/** Кнопки з підтримкою Motion-жестів (whileTap для ефекту кліку). */
const MotionIconButton = motion.create(IconButton);
const MotionButton = motion.create(Button);

/**
 * Панель керування над таблицею: навігація періоду + масштаб Week/Month + «Додати».
 * Опорна дата (anchor) і scale живуть у слайсі `period-navigation`; таблиця читає
 * той самий anchor + scale. Мітка періоду: week → діапазон днів, month → «Місяць рік».
 */
export function DashboardToolbar() {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateFnsLocale(i18n.language);
  const dispatch = useAppDispatch();
  const anchor = useAppSelector((s) => s.period.anchor);
  const scale = useAppSelector((s) => s.period.scale);
  const reduceMotion = useReducedMotion();

  const periodLabel = useMemo(() => {
    const date = fromISODate(anchor);
    if (scale === "month") {
      return format(date, "LLLL yyyy", { locale: dateLocale });
    }
    const week = getWeekDays(date);
    return `${format(week[0], "d MMM", { locale: dateLocale })} – ${format(
      week[6],
      "d MMM yyyy",
      { locale: dateLocale },
    )}`;
  }, [anchor, scale, dateLocale]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* --- Навігація періоду (UI-каркас, логіка — далі) ---
          Мобільний: група стрілок+дата зліва, «Сьогодні» відсунута праворуч.
          Десктоп: усе в один ряд зліва. */}
      <div className="flex items-center justify-between gap-2 sm:justify-start">
        <div className="flex items-center gap-1">
          <MotionIconButton
            variant="outline"
            size="sm"
            aria-label={t("toolbar.prevPeriod")}
            onClick={() => dispatch(prevPeriod())}
            whileTap={reduceMotion ? undefined : { scale: 0.88 }}
          >
            <ChevronLeft className="h-4 w-4" />
          </MotionIconButton>
          <span className="w-44 shrink-0 whitespace-nowrap text-center text-sm font-medium tabular-nums">
            {periodLabel}
          </span>
          <MotionIconButton
            variant="outline"
            size="sm"
            aria-label={t("toolbar.nextPeriod")}
            onClick={() => dispatch(nextPeriod())}
            whileTap={reduceMotion ? undefined : { scale: 0.88 }}
          >
            <ChevronRight className="h-4 w-4" />
          </MotionIconButton>
        </div>
        <MotionButton
          variant="outline"
          size="sm"
          onClick={() => dispatch(goToToday())}
          whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        >
          {t("toolbar.today")}
        </MotionButton>
      </div>

      {/* --- Масштаб Week / Month ---
          Мобільний: по центру екрана; десктоп: у ряд (sm:contents розчиняє обгортку). */}
      <div className="flex justify-center sm:contents">
        <div
          role="group"
          aria-label={t("toolbar.scale")}
          className="inline-flex rounded-md border border-border bg-muted p-0.5"
        >
          {(["week", "month"] as const).map((value) => {
            const active = value === scale;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => dispatch(setScale(value))}
                className={cn(
                  "relative rounded-[5px] px-3 py-1 text-sm font-medium transition-colors",
                  "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="dashboard-scale-pill"
                    className="absolute inset-0 rounded-[5px] bg-primary shadow-card"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 34 }
                    }
                  />
                )}
                <span className="relative z-10">{t(`toolbar.${value}`)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AddHabitButton className="w-full sm:ml-auto sm:w-auto" />
    </div>
  );
}
