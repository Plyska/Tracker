import { useNavigate } from "react-router-dom";
import { useGetHabitsQuery } from "@/entities/habit";
import { HabitTable } from "@/widgets/habit-table";
import { DashboardToolbar } from "@/widgets/dashboard-toolbar";
import { InsightCard } from "@/widgets/assistant";
import { paths } from "@/shared/config/paths";

function DashboardPage() {
  const navigate = useNavigate();
  // Той самий кешований запит, що й у HabitTable (RTK Query дедуплікує) — без подвійного фетчу.
  const { data: habits = [] } = useGetHabitsQuery();
  // Тулбар прив'язаний до наявності навичок: під час завантаження видно лише скелетон таблиці
  // (без тулбару), далі тулбар з'являється РАЗОМ із таблицею. Порожній акаунт → тулбару немає
  // взагалі (без проблиску), кнопка «Додати» лишається в empty-state (HabitTable).
  const showToolbar = habits.length > 0;

  return (
    <section className="space-y-8">
      {/* Підказка-патерн: «двері» до помічника. Без LLM, тож показуємо навіть до згоди — дані
          нікуди не йдуть. «Обговорити» веде одразу в розмову з зачіпкою цієї підказки: без неї
          людина приходила б у порожній чат і мусила переказувати щойно прочитане. Якщо згоди ще
          немає, сторінка розмови сама поверне на /assistant, де стоїть інтро й вмикач. */}
      <InsightCard
        onDiscuss={(seed) =>
          void navigate(paths.assistantChat, { state: { seed: { type: "insight", key: seed } } })
        }
      />
      {showToolbar && <DashboardToolbar />}
      <HabitTable />
    </section>
  );
}

export default DashboardPage;
