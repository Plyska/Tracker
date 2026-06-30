import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AddTaskButton } from "@/features/manage-tasks";
import { cn } from "@/shared/lib";
import type { PlannerTab } from "./DayPlan";

interface DayPlanToolbarProps {
  tab: PlannerTab;
  onTabChange: (tab: PlannerTab) => void;
}

const TABS: PlannerTab[] = ["active", "archived"];

/** Шапка планувальника: таби Active/Archived + «Додати задачу» (без дати → «Загальна»). */
export function DayPlanToolbar({ tab, onTabChange }: DayPlanToolbarProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div
        role="tablist"
        aria-label={t("planner.tabsLabel")}
        className="flex w-full rounded-md border border-border bg-muted p-0.5 sm:inline-flex sm:w-auto"
      >
        {TABS.map((value) => {
          const active = value === tab;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(value)}
              className={cn(
                "relative flex-1 rounded-[5px] px-3 py-1 text-sm font-medium transition-colors sm:flex-none",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="planner-tab-pill"
                  className="absolute inset-0 rounded-[5px] bg-primary shadow-card"
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 420, damping: 34 }
                  }
                />
              )}
              <span className="relative z-10">{t(`planner.tabs.${value}`)}</span>
            </button>
          );
        })}
      </div>

      <AddTaskButton className="w-full sm:ml-auto sm:w-auto" />
    </div>
  );
}
