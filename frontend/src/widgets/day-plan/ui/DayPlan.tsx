import { CalendarClock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGetTasksQuery, type Task } from "@/entities/task";
import { AddTaskButton } from "@/features/manage-tasks";
import { Skeleton } from "@/shared/ui";
import { useDelayedFlag } from "@/shared/lib/hooks/useDelayedFlag";
import { DaySticker } from "./DaySticker";

export type PlannerTab = "active" | "archived";

/** Порядок у межах картки: невиконані зверху, виконані — вниз; далі за часом / createdAt. */
const byDisplay = (a: Task, b: Task): number => {
  if (!!a.done !== !!b.done) return a.done ? 1 : -1;
  if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
  if (a.startTime) return -1;
  if (b.startTime) return 1;
  return a.createdAt.localeCompare(b.createdAt);
};

interface DayPlanProps {
  tab: PlannerTab;
  today: string; // ISO 'YYYY-MM-DD'
}

/**
 * Сітка стікерів. Показуємо лише картки, у яких є задачі (видалив картку → вона зникає).
 * Active: «Загальна» (без дати) першою + сьогодні/майбутні дні. Archived: минулі дні (новіші першими).
 * Дані тягнемо одним запитом і ділимо клієнтом.
 */
export function DayPlan({ tab, today }: DayPlanProps) {
  const { t } = useTranslation();
  const { data: tasks = [], isLoading } = useGetTasksQuery();
  const showSkeleton = useDelayedFlag(isLoading);

  if (showSkeleton) {
    return (
      <div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        role="status"
        aria-busy="true"
      >
        <span className="sr-only">{t("common.loading")}</span>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  // Без дати → «Загальна»; решта — групуємо по днях.
  const general: Task[] = [];
  const byDate = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.date) {
      general.push(task);
      continue;
    }
    const bucket = byDate.get(task.date);
    if (bucket) bucket.push(task);
    else byDate.set(task.date, [task]);
  }
  // Виконані — вниз кожної картки (стабільний порядок незалежно від кешу/рефетчу).
  general.sort(byDisplay);
  for (const bucket of byDate.values()) bucket.sort(byDisplay);

  if (tab === "archived") {
    const dates = [...byDate.keys()].filter((d) => d < today).sort().reverse();
    if (dates.length === 0) {
      return (
        <p className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          {t("planner.archivedEmpty")}
        </p>
      );
    }
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {dates.map((d) => (
          <DaySticker key={d} date={d} tasks={byDate.get(d) ?? []} />
        ))}
      </div>
    );
  }

  // Active: сьогодні та майбутні дні з задачами (лише непорожні).
  const activeDates = [...byDate.keys()].filter((d) => d >= today).sort();

  // Порожньо (нема ні «Загальної», ні активних днів) → стан із CTA.
  if (general.length === 0 && activeDates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <CalendarClock className="h-10 w-10 text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium">{t("planner.activeEmpty.title")}</p>
          <p className="text-sm text-muted-foreground">
            {t("planner.activeEmpty.subtitle")}
          </p>
        </div>
        <AddTaskButton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {/* «Загальна» (без дати) — першою, коли має задачі */}
      {general.length > 0 && <DaySticker date={null} tasks={general} />}
      {activeDates.map((d) => (
        <DaySticker key={d} date={d} tasks={byDate.get(d) ?? []} />
      ))}
    </div>
  );
}
