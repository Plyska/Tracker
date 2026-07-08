import { Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGetTasksQuery } from "@/entities/task";
import { byDisplay, DayView } from "@/widgets/day-plan";
import { paths } from "@/shared/config/paths";
import { Skeleton } from "@/shared/ui";
import { useDelayedFlag } from "@/shared/lib/hooks/useDelayedFlag";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Сторінка одного дня (`/planner/:date`) або «Загальної» (`/planner/general`).
 * Тягне всі задачі одним запитом і бере лише потрібний день. Невалідна дата → назад на сітку.
 */
function DayDetailPage() {
  const { t } = useTranslation();
  const { date } = useParams();
  const { data: tasks = [], isLoading } = useGetTasksQuery();
  const showSkeleton = useDelayedFlag(isLoading);

  // `/planner/general` → без параметра; `/planner/:date` → ISO-рядок.
  const general = date === undefined;
  if (!general && !ISO_DATE.test(date)) {
    return <Navigate to={paths.planner} replace />;
  }

  if (showSkeleton) {
    return (
      <div
        className="mx-auto flex w-full max-w-2xl flex-col gap-6"
        role="status"
        aria-busy="true"
      >
        <span className="sr-only">{t("common.loading")}</span>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-56" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const dayTasks = tasks
    .filter((task) => (general ? !task.date : task.date === date))
    .sort(byDisplay);

  return <DayView date={general ? null : date} tasks={dayTasks} />;
}

export default DayDetailPage;
