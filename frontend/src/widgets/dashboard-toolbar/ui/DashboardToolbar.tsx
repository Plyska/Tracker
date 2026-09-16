import { useMemo, useState } from "react";
import { format, isSameMonth, isSameYear } from "date-fns";
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

  /**
   * Мітка періоду. Місяць → «Місяць рік»; тиждень → діапазон днів, з якого прибрано все,
   * що повторюється (як у календарях): «14 – 20 верес. 2026», а не «14 верес. – 20 верес. 2026».
   *
   * Тиждень на межі року показує рік з обох боків — інакше «28 груд. – 3 січ. 2027» приписує
   * грудень до 2027-го. Разом це ще й тримає мітку короткою: українські назви місяців удвічі
   * довші за англійські, і саме подвоєний місяць виносив її за межі відведеного місця.
   */
  const periodLabel = useMemo(() => {
    const date = fromISODate(anchor);
    if (scale === "month") {
      return format(date, "LLLL yyyy", { locale: dateLocale });
    }
    const week = getWeekDays(date);
    const [start, end] = [week[0], week[6]];
    const startFormat = !isSameYear(start, end)
      ? "d MMM yyyy"
      : isSameMonth(start, end)
        ? "d"
        : "d MMM";
    return `${format(start, startFormat, { locale: dateLocale })} – ${format(
      end,
      "d MMM yyyy",
      { locale: dateLocale },
    )}`;
  }, [anchor, scale, dateLocale]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* --- Навігація періоду ---
          Мобільний (Google-style): [Today] [‹][›] мітка — через flex `order`.
          Десктоп (sm): order скидається → DOM-порядок ‹ мітка › Today (як було). */}
      <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap">
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
        {/* Місце під мітку резервуємо, а не підганяємо під текст: інакше «Сьогодні» й перемикач
            масштабу смикалися б щоразу, коли діапазон стає коротшим чи довшим. Але резерв —
            через `min-width`, а не фіксовану ширину: якщо мітка колись усе-таки переросте його
            (довша мова, збільшений шрифт у браузері), вона розсуне місце, а не обріжеться —
            саме так і губилися краї українського діапазону.

            `overflow-hidden` лишається заради анімації: мітка виїжджає вбік на 16px, і без
            обрізання цей кадр налазив би на стрілки.

            Розмір резерву — за виміряними мітками, а не на око: найширша («26 жовт. – 1 листоп.
            2026», а на межі року «28 груд. 2026 – 3 січ. 2027») просить ~187px, тож 12rem лишає
            невеликий запас на інші платформи й не роздуває відступ до стрілок у решти тижнів,
            яким вистачає ~130px.

            На вузькому екрані резерв більший (14rem) і працює інакше: там це flex-basis, тож щойно
            після стрілок і «Сьогодні» лишається менше — мітка переходить на власний рядок. Поріг
            саме на ширині рядка, а не на довжині тексту: інакше розкладка стрибала б з одного
            рядка на два під час гортання тижнів. */}
        <span className="order-4 flex min-w-0 flex-[1_1_14rem] justify-center overflow-hidden text-center text-sm font-medium sm:order-0 sm:min-w-44 sm:flex-none sm:basis-auto">
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
