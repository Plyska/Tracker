import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useGetHabitsQuery } from "@/entities/habit";
import { Card, Skeleton } from "@/shared/ui";
import { StatsToolbar } from "./StatsToolbar";
import { MetricCards } from "./MetricCards";
import { ProgressCard } from "./ProgressCard";
import { MoversCard } from "./MoversCard";
import { WeekdayCard } from "./WeekdayCard";
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
        {/* Інсайти: динаміка vs попередній період + per-habit movers + дні тижня. min-w-0 як усюди;
            lg:h-full на картках → однакова висота в ряду. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0">
            <ProgressCard />
          </div>
          <div className="min-w-0">
            <MoversCard />
          </div>
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <WeekdayCard />
          </div>
        </div>
        {/* Графік 2/3, настрій 1/3. На lg обидві картки lg:h-full + grid-stretch → однакова висота
            (графік заповнює її через flex-1, див. ActivityChart). На мобільному стек — у графіка
            фіксована висота. min-w-0 на grid-нащадках: інакше колонка графіка (з широким minWidth
            на рік/весь час) не стискається до треку й розпирає сітку вправо разом із Mood-карткою. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <ActivityChart />
          </div>
          <div className="min-w-0">
            <MoodCorrelationCard />
          </div>
        </div>
        <Heatmap />
      </div>
    </AnimatePresence>
  );
}
