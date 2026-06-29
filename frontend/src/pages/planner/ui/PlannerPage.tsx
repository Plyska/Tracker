import { useState } from "react";
import { DayPlan, DayPlanToolbar, type PlannerTab } from "@/widgets/day-plan";
import { todayISODate } from "@/shared/lib";

/**
 * Розпорядок дня / список справ. Таби Active/Archived; задачі без дати — у «Загальній» картці.
 * День задачі обирається в модалці. Архів — картки днів, що вже минули.
 */
function PlannerPage() {
  const today = todayISODate();
  const [tab, setTab] = useState<PlannerTab>("active");

  return (
    <section className="space-y-6">
      <DayPlanToolbar tab={tab} onTabChange={setTab} />
      <DayPlan tab={tab} today={today} />
    </section>
  );
}

export default PlannerPage;
