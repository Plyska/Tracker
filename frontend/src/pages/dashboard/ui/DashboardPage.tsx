import { useGetHabitsQuery } from "@/entities/habit";
import { HabitTable } from "@/widgets/habit-table";
import { DashboardToolbar } from "@/widgets/dashboard-toolbar";

function DashboardPage() {
  // Той самий кешований запит, що й у HabitTable (RTK Query дедуплікує) — без подвійного фетчу.
  const { data: habits = [] } = useGetHabitsQuery();
  // Тулбар прив'язаний до наявності навичок: під час завантаження видно лише скелетон таблиці
  // (без тулбару), далі тулбар з'являється РАЗОМ із таблицею. Порожній акаунт → тулбару немає
  // взагалі (без проблиску), кнопка «Додати» лишається в empty-state (HabitTable).
  const showToolbar = habits.length > 0;

  return (
    <section className="space-y-8">
      {showToolbar && <DashboardToolbar />}
      <HabitTable />
    </section>
  );
}

export default DashboardPage;
