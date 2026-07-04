import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/app/store/hooks";
import { useGetHabitsQuery } from "@/entities/habit";
import { Card, Skeleton, Tilt } from "@/shared/ui";
import { cn } from "@/shared/lib";
import { StatsToolbar } from "./StatsToolbar";
import { MetricCards } from "./MetricCards";
import { GoalCard } from "./GoalCard";
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
  const hidden = useAppSelector((s) => s.uiPrefs.hiddenStatWidgets);
  const show = (key: string) => !hidden.includes(key);
  // Графік і настрій ділять ряд лише коли обидва видимі; інакше видиме займає всю ширину.
  const bothChartMood = show("activity") && show("mood");

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
        {/* Метрики вимикаються поштучно — MetricCards самі ховають приховані плитки (і весь ряд, якщо всі). */}
        <MetricCards />
        {/* Інсайти: ціль + динаміка vs попередній період + per-habit movers + дні тижня. min-w-0
            як усюди; lg:h-full на картках → однакова висота в ряду. `auto-fit` → видимі картки
            заповнюють ширину незалежно від кількості (приховані не лишають дір). */}
        {(show("goal") ||
          show("progress") ||
          show("movers") ||
          show("weekday")) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))]">
            {show("goal") && (
              <div className="min-w-0">
                <Tilt>
                  <GoalCard />
                </Tilt>
              </div>
            )}
            {show("progress") && (
              <div className="min-w-0">
                <Tilt>
                  <ProgressCard />
                </Tilt>
              </div>
            )}
            {show("movers") && (
              <div className="min-w-0">
                <Tilt>
                  <MoversCard />
                </Tilt>
              </div>
            )}
            {show("weekday") && (
              <div className="min-w-0">
                <Tilt>
                  <WeekdayCard />
                </Tilt>
              </div>
            )}
          </div>
        )}
        {/* Графік 2/3, настрій 1/3. На lg обидві картки lg:h-full + grid-stretch → однакова висота
            (графік заповнює її через flex-1, див. ActivityChart). На мобільному стек — у графіка
            фіксована висота. min-w-0 на grid-нащадках: інакше колонка графіка (з широким minWidth
            на рік/весь час) не стискається до треку й розпирає сітку вправо разом із Mood-карткою. */}
        {(show("activity") || show("mood")) && (
          <div
            className={cn(
              "grid grid-cols-1 gap-4",
              bothChartMood && "lg:grid-cols-3",
            )}
          >
            {show("activity") && (
              <div className={cn("min-w-0", bothChartMood && "lg:col-span-2")}>
                <ActivityChart />
              </div>
            )}
            {show("mood") && (
              <div className="min-w-0">
                <Tilt>
                  <MoodCorrelationCard />
                </Tilt>
              </div>
            )}
          </div>
        )}
        {show("heatmap") && <Heatmap />}
      </div>
    </AnimatePresence>
  );
}
