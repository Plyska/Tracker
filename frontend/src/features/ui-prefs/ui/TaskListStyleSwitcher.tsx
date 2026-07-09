import { motion, useReducedMotion } from "framer-motion";
import { CheckSquare, Clock, ListOrdered } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { cn } from "@/shared/lib";
import { setTaskListStyle, type TaskListStyle } from "../model/uiPrefsSlice";

const STYLES: { value: TaskListStyle; icon: typeof CheckSquare }[] = [
  { value: "checkbox", icon: CheckSquare },
  { value: "numbered", icon: ListOrdered },
  { value: "timeline", icon: Clock },
];

/**
 * Segmented-перемикач вигляду рядків задач (чекбокс / номер / час). Пише в `ui-prefs`.
 * Активний — акцентний «pill», що плавно переїжджає (layoutId). `layoutId` унікальний на інстанс,
 * щоб два перемикачі (тулбар + модалка) не конфліктували, якщо колись зʼявляться одночасно.
 */
export function TaskListStyleSwitcher({
  layoutId = "task-list-style-pill",
}: {
  layoutId?: string;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dispatch = useAppDispatch();
  const style = useAppSelector((s) => s.uiPrefs.taskListStyle);

  return (
    <div
      role="group"
      aria-label={t("planner.listStyle")}
      className="flex items-center rounded-md border border-border bg-muted p-0.5"
    >
      {STYLES.map(({ value, icon: Icon }) => {
        const active = value === style;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={t(`planner.style.${value}`)}
            title={t(`planner.style.${value}`)}
            onClick={() => dispatch(setTaskListStyle(value))}
            className={cn(
              "relative flex h-7 w-8 items-center justify-center rounded-[5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-[5px] bg-primary shadow-card"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 34 }
                }
              />
            )}
            <Icon className="relative z-10 h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
