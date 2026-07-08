import { useState } from "react";
import { AlertDialog } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useClearTasksMutation, type Task } from "@/entities/task";
import { AddTaskButton } from "@/features/manage-tasks";
import { Button, DatePicker, IconButton } from "@/shared/ui";
import { paths } from "@/shared/config/paths";
import {
  addDaysISO,
  cn,
  fromISODate,
  getDateFnsLocale,
  isToday,
  todayISODate,
} from "@/shared/lib";
import { TaskList } from "./TaskList";

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
  const [clearTasks] = useClearTasksMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);

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
      <Link
        to={paths.planner}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("planner.back")}
      </Link>

      {/* Навігатор дня + дії */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          {general ? (
            <h1 className="text-xl font-semibold sm:text-2xl">{heading}</h1>
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
                triggerFormat="EEEE, d MMMM"
                className="h-10 text-base font-semibold capitalize"
              />
              <IconButton
                size="sm"
                aria-label={t("planner.nextDay")}
                onClick={() => goToDay(addDaysISO(date, 1))}
              >
                <ChevronRight className="h-5 w-5" />
              </IconButton>
            </>
          )}
          {today && (
            <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {t("toolbar.today")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!general && !today && (
            <Button variant="outline" size="sm" onClick={() => goToDay(todayISODate())}>
              {t("toolbar.today")}
            </Button>
          )}
          {tasks.length > 0 && (
            <IconButton
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

      <TaskList tasks={tasks} />

      <div>
        <AddTaskButton date={date ?? undefined} />
      </div>

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
