import { motion, useReducedMotion } from "framer-motion";
import { CalendarRange } from "lucide-react";
import { useTranslation } from "react-i18next";
import { bestWorstWeekday, useStatsData, type WeekdayStat } from "@/features/stats-period";
import { Card, InfoHint, Skeleton } from "@/shared/ui";
import { cn } from "@/shared/lib";

const MotionCard = motion.create(Card);

function WeekdayRow({
  label,
  day,
  tone,
}: {
  label: string;
  day: WeekdayStat;
  tone: "good" | "bad";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-sm font-semibold">{day.name}</span>
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            tone === "good"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400",
          )}
        >
          {Math.round(day.ratio * 100)}%
        </span>
      </span>
    </div>
  );
}

/**
 * Найкращий/найгірший день тижня за часткою виконання (з `daily[]` поточного періоду).
 * Frontend-only, працює для будь-якого масштабу. Замало даних / немає варіації → empty-state.
 */
export function WeekdayCard() {
  const { t, i18n } = useTranslation();
  const reduce = useReducedMotion();
  const { stats, isLoading, key } = useStatsData();

  if (isLoading || !stats) return <Skeleton className="h-64 rounded-xl lg:h-full" />;

  const title = t("statistics.weekday.title");
  const info = t("statistics.weekday.info");
  const insight = bestWorstWeekday(stats.daily, i18n.language);

  if (!insight) {
    return (
      <MotionCard
        key={`empty-${key}`}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex flex-col gap-3 p-4 sm:p-5 lg:h-full"
      >
        <Header title={title} info={info} />
        <p className="text-sm text-muted-foreground">
          {t("statistics.weekday.empty")}
        </p>
      </MotionCard>
    );
  }

  return (
    <MotionCard
      key={key}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col gap-4 p-4 sm:p-5 lg:h-full"
    >
      <Header title={title} info={info} />
      <div className="space-y-2.5">
        <WeekdayRow label={t("statistics.weekday.best")} day={insight.best} tone="good" />
        <WeekdayRow label={t("statistics.weekday.worst")} day={insight.worst} tone="bad" />
      </div>
    </MotionCard>
  );
}

function Header({ title, info }: { title: string; info: string }) {
  return (
    <div className="flex items-center gap-2">
      <CalendarRange className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <h3 className="text-sm font-semibold">{title}</h3>
      <InfoHint label={info} className="ml-auto" />
    </div>
  );
}
