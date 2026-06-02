import { HabitTable } from "@/widgets/habit-table";
import { AddHabitButton } from "@/features/manage-habits";

function DashboardPage() {
  return (
    <section className="space-y-5">
      <div className="flex sm:justify-end">
        <AddHabitButton className="w-full sm:w-auto" />
      </div>
      <HabitTable />
    </section>
  );
}

export default DashboardPage;
