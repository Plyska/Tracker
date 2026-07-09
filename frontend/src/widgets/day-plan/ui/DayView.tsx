import { useState } from "react";
import { AlertDialog, Popover } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import {
  ALargeSmall,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useClearTasksMutation, type Task } from "@/entities/task";
import {
  EDITOR_SCALE_MAX,
  EDITOR_SCALE_MIN,
  setEditorScale,
  TaskListStyleSwitcher,
} from "@/features/ui-prefs";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { Button, DatePicker, IconButton, Range } from "@/shared/ui";
import { paths } from "@/shared/config/paths";
import {
  addDaysISO,
  cn,
  fromISODate,
  getDateFnsLocale,
  isToday,
  todayISODate,
} from "@/shared/lib";
import { DayEditor } from "./DayEditor";

interface DayViewProps {
  /** ISO 'YYYY-MM-DD' або null — «Загальна» картка (задачі без дати). */
  date: string | null;
  /** Уже відсортовані задачі цього дня / «Загальної». */
  tasks: Task[];
}

/**
 * Повноекранний вигляд одного дня (або «Загальної»): навігація по днях (‹ ›, календар,
 * «сьогодні»), список задач, додавання й очищення картки. Замінює колишню модалку.
 */
export function DayView({ date, tasks }: DayViewProps) {
  const { t, i18n } = useTranslation();
  const locale = getDateFnsLocale(i18n.language);
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const editorScale = useAppSelector((s) => s.uiPrefs.editorScale);
  const [clearTasks] = useClearTasksMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);

  const general = date === null;
  const day = general ? null : fromISODate(date);
  const today = day ? isToday(day) : false;
  const heading = general
    ? t("planner.general")
    : format(day!, "EEEE, d MMMM", { locale });

  const goToDay = (iso: string) => navigate(paths.plannerDay(iso));

  const onClearCard = () => {
    void clearTasks(general ? { general: true } : { date: date! });
    setConfirmOpen(false);
    navigate(paths.planner);
  };

  const dialogMotion = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
      };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {/* Єдиний тулбар в один рядок: назад + навігація дня + налаштування + очищення */}
      <div className="flex items-center gap-1 overflow-x-auto">
        <IconButton
          size="sm"
          aria-label={t("planner.back")}
          title={t("planner.back")}
          onClick={() => navigate(paths.planner)}
        >
          <ArrowLeft className="h-4 w-4" />
        </IconButton>

        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />

        {general ? (
          <h1 className="truncate text-base font-semibold sm:text-lg">{heading}</h1>
        ) : (
          <>
            <IconButton
              size="sm"
              aria-label={t("planner.prevDay")}
              onClick={() => goToDay(addDaysISO(date, -1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </IconButton>
            <DatePicker
              value={date}
              onChange={(v) => v && goToDay(v)}
              triggerFormat="EEE, d MMM"
              className="shrink-0 font-medium capitalize"
            />
            <IconButton
              size="sm"
              aria-label={t("planner.nextDay")}
              onClick={() => goToDay(addDaysISO(date, 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </IconButton>
            {!today && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => goToDay(todayISODate())}
              >
                {t("toolbar.today")}
              </Button>
            )}
          </>
        )}
        {today && (
          <span className="ml-1 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {t("toolbar.today")}
          </span>
        )}

        {/* Праворуч: вигляд списку + очищення */}
        <div className="ml-auto flex shrink-0 items-center gap-1 pl-1">
          <TaskListStyleSwitcher layoutId="planner-style-pill" />

          {/* Масштаб тексту редактора */}
          <Popover.Root open={sizeOpen} onOpenChange={setSizeOpen}>
            <Popover.Trigger asChild>
              <button
                type="button"
                aria-label={t("planner.textSize")}
                title={t("planner.textSize")}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  sizeOpen
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground/70 hover:text-foreground",
                )}
              >
                <ALargeSmall className="h-5 w-5" />
              </button>
            </Popover.Trigger>
            <Popover.Portal forceMount>
              <AnimatePresence>
                {sizeOpen && (
                  <Popover.Content asChild forceMount align="end" sideOffset={6}>
                    <motion.div
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      style={{
                        transformOrigin:
                          "var(--radix-popover-content-transform-origin)",
                      }}
                      className="z-50 w-56 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-card"
                    >
                      <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <span>{t("planner.textSize")}</span>
                        <span className="tabular-nums">
                          {Math.round(editorScale * 100)}%
                        </span>
                      </div>
                      <Range
                        aria-label={t("planner.textSize")}
                        value={editorScale}
                        min={EDITOR_SCALE_MIN}
                        max={EDITOR_SCALE_MAX}
                        step={0.05}
                        onValueChange={(v) => dispatch(setEditorScale(v))}
                      />
                    </motion.div>
                  </Popover.Content>
                )}
              </AnimatePresence>
            </Popover.Portal>
          </Popover.Root>

          {tasks.length > 0 && (
            <IconButton
              size="sm"
              aria-label={t("planner.deleteCard")}
              title={t("planner.deleteCard")}
              onClick={() => setConfirmOpen(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          )}
        </div>
      </div>

      {/* Редактор у стилі щоденної нотатки (курсор + пиши). `TaskList` лишається для
          майбутнього перемикача «Список / Редактор». */}
      <DayEditor date={date} tasks={tasks} />

      <AlertDialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AnimatePresence>
          {confirmOpen && (
            <AlertDialog.Portal forceMount>
              <AlertDialog.Overlay asChild forceMount>
                <motion.div
                  className="fixed inset-0 z-50 bg-black/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.32, ease: "easeOut" }}
                />
              </AlertDialog.Overlay>
              <AlertDialog.Content asChild forceMount>
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div
                    className={cn(
                      "w-full max-w-sm",
                      "rounded-xl border border-border bg-card p-6 text-card-foreground shadow-card",
                    )}
                    initial={dialogMotion.initial}
                    animate={dialogMotion.animate}
                    exit={dialogMotion.exit}
                    transition={{ duration: 0.32, ease: "easeOut" }}
                  >
                    <AlertDialog.Title className="text-lg font-semibold">
                      {t("planner.deleteCard")}
                    </AlertDialog.Title>
                    <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                      {t("planner.deleteCardConfirm", {
                        name: heading,
                        count: tasks.length,
                      })}
                    </AlertDialog.Description>
                    <div className="mt-6 flex justify-end gap-2">
                      <AlertDialog.Cancel asChild>
                        <Button variant="outline">{t("common.cancel")}</Button>
                      </AlertDialog.Cancel>
                      <AlertDialog.Action asChild>
                        <Button
                          onClick={onClearCard}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t("tasks.menu.delete")}
                        </Button>
                      </AlertDialog.Action>
                    </div>
                  </motion.div>
                </div>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          )}
        </AnimatePresence>
      </AlertDialog.Root>
    </div>
  );
}
