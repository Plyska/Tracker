import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { type Task } from "@/entities/task";
import { TaskItem } from "@/features/manage-tasks";

/**
 * Анімований список задач (вже відсортований: активні зверху, виконані внизу). Виконані згорнуто
 * під розділювачем-кнопкою «Виконані» зі стрілкою — розкриваються/ховаються за кліком. Порожньо → підказка.
 */
export function TaskList({ tasks }: { tasks: Task[] }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [showDone, setShowDone] = useState(false);

  if (tasks.length === 0) {
    return (
      <p className="py-2 text-sm text-muted-foreground">{t("planner.dayEmpty")}</p>
    );
  }

  const activeTasks = tasks.filter((task) => !task.done);
  const doneTasks = tasks.filter((task) => task.done);

  const itemMotion = {
    layout: !reduceMotion,
    initial: reduceMotion ? false : { opacity: 0, y: -4 },
    animate: { opacity: 1, y: 0 },
    exit: reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 },
    transition: { duration: 0.18, ease: "easeOut" },
  } as const;

  return (
    <ul className="space-y-2">
      <AnimatePresence initial={false}>
        {activeTasks.map((task) => (
          <motion.li key={task.id} {...itemMotion}>
            <TaskItem task={task} />
          </motion.li>
        ))}
      </AnimatePresence>

      {doneTasks.length > 0 && (
        <>
          <motion.li layout={!reduceMotion}>
            <button
              type="button"
              onClick={() => setShowDone((v) => !v)}
              aria-expanded={showDone}
              aria-label={showDone ? t("planner.hideDone") : t("planner.showDone")}
              className="flex w-full items-center gap-2 px-1 pt-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="h-px flex-1 bg-border" />
              <span className="flex items-center gap-1">
                {t("planner.doneSection", { count: doneTasks.length })}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${showDone ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </span>
              <span className="h-px flex-1 bg-border" />
            </button>
          </motion.li>

          <AnimatePresence initial={false}>
            {showDone && (
              <motion.li
                key="done-section"
                layout={!reduceMotion}
                initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                animate={reduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {doneTasks.map((task) => (
                      <motion.li key={task.id} {...itemMotion}>
                        <TaskItem task={task} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </motion.li>
            )}
          </AnimatePresence>
        </>
      )}
    </ul>
  );
}
