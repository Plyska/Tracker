import { HabitTable } from "@/widgets/habit-table";
import { DashboardToolbar } from "@/widgets/dashboard-toolbar";

function DashboardPage() {
  return (
    <section className="space-y-8">
      <DashboardToolbar />
      <HabitTable />
    </section>
  );
}

export default DashboardPage;
