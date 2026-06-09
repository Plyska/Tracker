import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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

  // Напрямок останньої зміни мітки періоду: -1 ‹ / +1 › (горизонтальний слайд у бік стрілки),
  // 0 — Today / зміна масштабу (вертикальний слайд, як заголовок сторінки).
  const [dir, setDir] = useState(0);
  const SHIFT = 16;
  const labelVariants = {
    enter: (d: number) =>
      reduceMotion
        ? { opacity: 0 }
        : d === 0
          ? { opacity: 0, y: 6 }
          : { opacity: 0, x: -d * SHIFT },
    center: { opacity: 1, x: 0, y: 0 },
    exit: (d: number) =>
      reduceMotion
        ? { opacity: 0 }
        : d === 0
          ? { opacity: 0, y: -6 }
          : { opacity: 0, x: d * SHIFT },
  };

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
      {/* --- Навігація періоду ---
          Мобільний (Google-style): [Today] [‹][›] мітка — через flex `order`.
          Десктоп (sm): order скидається → DOM-порядок ‹ мітка › Today (як було). */}
      <div className="flex items-center gap-1">
        <MotionIconButton
          className="order-2 sm:order-0"
          variant="outline"
          size="sm"
          aria-label={t("toolbar.prevPeriod")}
          onClick={() => {
            setDir(-1);
            dispatch(prevPeriod());
          }}
          whileTap={reduceMotion ? undefined : { scale: 0.88 }}
        >
          <ChevronLeft className="h-4 w-4" />
        </MotionIconButton>
        <span className="order-4 flex min-w-0 flex-1 justify-center overflow-hidden text-sm font-medium sm:order-0 sm:w-44 sm:flex-none">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.span
              key={periodLabel}
              custom={dir}
              variants={labelVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="whitespace-nowrap tabular-nums"
            >
              {periodLabel}
            </motion.span>
          </AnimatePresence>
        </span>
        <MotionIconButton
          className="order-3 sm:order-0"
          variant="outline"
          size="sm"
          aria-label={t("toolbar.nextPeriod")}
          onClick={() => {
            setDir(1);
            dispatch(nextPeriod());
          }}
          whileTap={reduceMotion ? undefined : { scale: 0.88 }}
        >
          <ChevronRight className="h-4 w-4" />
        </MotionIconButton>
        <MotionButton
          className="order-1 sm:order-0 sm:ml-1"
          variant="outline"
          size="sm"
          onClick={() => {
            setDir(0);
            dispatch(goToToday());
          }}
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
                onClick={() => {
                  setDir(0);
                  dispatch(setScale(value));
                }}
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
