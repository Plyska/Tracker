import { useTranslation } from "react-i18next";
import { HabitTable } from "@/widgets/habit-table";
import { AddHabitButton } from "@/features/manage-habits";

function DashboardPage() {
  const { t } = useTranslation();

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("dashboard.title")}
        </h2>
        <AddHabitButton />
      </div>
      <HabitTable />
    </section>
  );
}

export default DashboardPage;
