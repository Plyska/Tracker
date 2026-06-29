import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useGetHabitsQuery } from "@/entities/habit";
import { Card, Skeleton } from "@/shared/ui";
import { StatsToolbar } from "./StatsToolbar";
import { MetricCards } from "./MetricCards";
import { Heatmap } from "./Heatmap";
import { ActivityChart } from "./ActivityChart";
import { MoodCorrelationCard } from "./MoodCorrelationCard";

/** Композитний віджет сторінки Statistics: тулбар + метрики + графіки + heatmap + mood-кореляція. */
export function StatisticsView() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const { data: habits, isLoading } = useGetHabitsQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-full rounded-md sm:w-80" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Порожній акаунт: статистику нема з чого рахувати.
  if (!habits || habits.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-base font-medium">{t("statistics.empty.title")}</p>
        <p className="text-sm text-muted-foreground">{t("statistics.empty.hint")}</p>
      </Card>
    );
  }

  return (
    // Власний AnimatePresence скидає PresenceContext від MainLayout (`initial={false}`), який
    // інакше глушив би mount-анімації вкладених карток при перезавантаженні сторінки.
    <AnimatePresence>
      <div key="stats-view" className="space-y-6">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <StatsToolbar />
        </motion.div>
        <MetricCards />
        {/* Графік 2/3, настрій 1/3. Висоту рядка задає картка «Настрій і навички» (за контентом),
            а графік (h-full) підлаштовується під неї. Картка настрою без h-full → лишається за
            контентом (без порожнечі всередині), навіть якщо комірка тягнеться. */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-full lg:col-span-2">
            <ActivityChart />
          </div>
          <MoodCorrelationCard />
        </div>
        <Heatmap />
      </div>
    </AnimatePresence>
  );
}
