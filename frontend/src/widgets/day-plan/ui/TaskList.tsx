import { Fragment } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { type Task } from "@/entities/task";
import { TaskItem } from "@/features/manage-tasks";

/**
 * Анімований список задач (вже відсортований: активні зверху, виконані внизу). Перед першою
 * виконаною — розділювач «Виконані». Порожньо → підказка.
 */
export function TaskList({ tasks }: { tasks: Task[] }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  if (tasks.length === 0) {
    return (
      <p className="py-2 text-sm text-muted-foreground">{t("planner.dayEmpty")}</p>
    );
  }

  const doneCount = tasks.filter((task) => task.done).length;

  return (
    <ul className="space-y-2">
      <AnimatePresence initial={false}>
        {tasks.map((task, i) => {
          // Розділювач перед першою виконаною задачею (за наявності й активних, і виконаних).
          const showDivider = task.done && i > 0 && !tasks[i - 1].done;
          return (
            <Fragment key={task.id}>
              {showDivider && (
                <motion.li
                  layout={!reduceMotion}
                  aria-hidden
                  className="flex items-center gap-2 px-1 pt-1 text-xs font-medium text-muted-foreground"
                >
                  <span className="h-px flex-1 bg-border" />
                  {t("planner.doneSection", { count: doneCount })}
                  <span className="h-px flex-1 bg-border" />
                </motion.li>
              )}
              <motion.li
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <TaskItem task={task} />
              </motion.li>
            </Fragment>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
