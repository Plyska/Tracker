import { useState } from "react";
import { format } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGetHabitsQuery } from "@/entities/habit";
import { type Task } from "@/entities/task";
import { cn, fromISODate, getDateFnsLocale, isToday } from "@/shared/lib";
import { DayModal } from "./DayModal";

interface DayStickerProps {
  /** ISO 'YYYY-MM-DD' або null — «Загальна» картка (задачі без дати). */
  date: string | null;
  tasks: Task[];
}

const PREVIEW_COUNT = 3;

/** Компактний стікер дня (або «Загальна») у сітці. Клік → модалка з повним списком. */
export function DaySticker({ date, tasks }: DayStickerProps) {
  const { t, i18n } = useTranslation();
  const locale = getDateFnsLocale(i18n.language);
  const reduceMotion = useReducedMotion();
  const { data: habits = [] } = useGetHabitsQuery();
  const [open, setOpen] = useState(false);

  const general = date === null;
  const day = general ? null : fromISODate(date);
  const today = day ? isToday(day) : false;
  const preview = tasks.slice(0, PREVIEW_COUNT);
  const more = tasks.length - preview.length;
  const doneCount = tasks.filter((task) => task.done).length;

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        className={cn(
          "flex min-h-32 flex-col rounded-xl border border-border bg-card p-3 text-left text-card-foreground shadow-card outline-none",
          "transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring",
          general && "border-primary/30 bg-primary/5",
        )}
      >
        {/* Заголовок: дата / «Загальна» (+ бейдж «сьогодні»); праворуч — лічильник */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            {general ? (
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <Inbox className="h-4 w-4 shrink-0" />
                {t("planner.general")}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold capitalize">
                    {format(day!, "EEEE", { locale })}
                  </span>
                  {today && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-primary"
                      aria-hidden
                    />
                  )}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {format(day!, "d MMM", { locale })}
                </div>
              </>
            )}
          </div>
          {tasks.length > 0 && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {doneCount}/{tasks.length}
            </span>
          )}
        </div>

        {/* Прев'ю задач */}
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("planner.dayEmpty")}</p>
        ) : (
          <ul className="space-y-1">
            {preview.map((task) => {
              const habit = task.habitId
                ? habits.find((h) => h.id === task.habitId)
                : undefined;
              return (
                <li
                  key={task.id}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: habit?.color ?? "var(--border)" }}
                    aria-hidden
                  />
                  {task.startTime && (
                    <span className="shrink-0 font-mono tabular-nums">
                      {task.startTime}
                    </span>
                  )}
                  <span className={cn("truncate", task.done && "line-through")}>
                    {task.title}
                  </span>
                </li>
              );
            })}
            {more > 0 && (
              <li className="text-xs font-medium text-muted-foreground">
                {t("planner.moreTasks", { count: more })}
              </li>
            )}
          </ul>
        )}
      </motion.button>

      <DayModal date={date} tasks={tasks} open={open} onOpenChange={setOpen} />
    </>
  );
}
