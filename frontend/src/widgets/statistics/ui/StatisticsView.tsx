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
import { SynergyCard } from "./SynergyCard";
import { MilestonesCard } from "./MilestonesCard";
import { Heatmap } from "./Heatmap";
import { ActivityChart } from "./ActivityChart";
import { MoodCorrelationCard } from "./MoodCorrelationCard";

// Елемент ряду інсайтів: до 3 у ряд (1→2→3 колонки), базис = «третина», `grow` заповнює
// неповний останній ряд (жодних дір при прихованих віджетах; при всіх 6 виходить рівно 3+3).
const INSIGHT_ITEM =
  "min-w-0 grow basis-full sm:basis-[calc((100%_-_1rem)/2)] lg:basis-[calc((100%_-_2rem)/3)]";

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
        {/* Інсайти: сітка 1→2→3 колонки. Порядок такий, щоб на lg вийшло рівно 3+3:
            верх — Динаміка / Що змінилось / Дні тижня; низ — Ціль / Синергія / Досягнення. */}
        {(show("progress") ||
          show("movers") ||
          show("weekday") ||
          show("goal") ||
          show("synergy") ||
          show("milestones")) && (
          <div className="flex flex-wrap gap-4">
            {show("progress") && (
              <div className={INSIGHT_ITEM}>
                <Tilt>
                  <ProgressCard />
                </Tilt>
              </div>
            )}
            {show("movers") && (
              <div className={INSIGHT_ITEM}>
                <Tilt>
                  <MoversCard />
                </Tilt>
              </div>
            )}
            {show("weekday") && (
              <div className={INSIGHT_ITEM}>
                <Tilt>
                  <WeekdayCard />
                </Tilt>
              </div>
            )}
            {show("goal") && (
              <div className={INSIGHT_ITEM}>
                <Tilt>
                  <GoalCard />
                </Tilt>
              </div>
            )}
            {show("synergy") && (
              <div className={INSIGHT_ITEM}>
                <Tilt>
                  <SynergyCard />
                </Tilt>
              </div>
            )}
            {show("milestones") && (
              <div className={INSIGHT_ITEM}>
                <Tilt>
                  <MilestonesCard />
                </Tilt>
              </div>
            )}
          </div>
        )}
        {/* Графік 2/3 + настрій 1/3 (як було). Одне з двох видиме → на всю ширину. */}
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
