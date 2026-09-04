import { motion, useReducedMotion } from "framer-motion";
import { Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStatsData } from "@/features/stats-period";
import { Card, InfoHint, Skeleton } from "@/shared/ui";
import { minutesToHoursLabel } from "@/shared/lib";

const MotionCard = motion.create(Card);

/**
 * Час на навички (ADR 0011): сумарні години по кожній ЧАСОВІЙ навичці за період + розподіл (бари)
 * + сумарно й середнє за активний день. Джерело — `habitBreakdown.totalMinutes` і `daily.minutes`.
 * Рендериться лише коли є ≥1 часова навичка із залогованим часом.
 */
export function TimeByHabitCard() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const { stats, habits, isLoading, key } = useStatsData();

  if (isLoading || !stats)
    return <Skeleton className="h-64 rounded-xl lg:h-full" />;

  const nameOf = (id: string) => habits.find((h) => h.id === id)?.name ?? "—";
  const colorOf = (id: string) =>
    habits.find((h) => h.id === id)?.color ?? "var(--primary)";

  const rows = stats.habitBreakdown
    .filter((b) => b.weeklyMinutesTarget != null && b.totalMinutes > 0)
    .sort((a, b) => b.totalMinutes - a.totalMinutes);
  const totalMinutes = rows.reduce((s, r) => s + r.totalMinutes, 0);
  const maxMinutes = rows.reduce((m, r) => Math.max(m, r.totalMinutes), 0);
  const activeDays = stats.daily.filter((d) => d.minutes > 0).length;
  const avgPerDay = activeDays ? Math.round(totalMinutes / activeDays) : 0;

  const hoursLabel = (m: number) =>
    `${minutesToHoursLabel(m)}${t("habits.hoursSuffix")}`;

  return (
    <MotionCard
      key={key}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col gap-4 p-4 sm:p-5 lg:h-full"
    >
      <div className="flex items-center gap-2">
        <Timer className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold">{t("statistics.time.title")}</h3>
        <InfoHint label={t("statistics.time.info")} className="ml-auto" />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("statistics.time.empty")}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">
              {hoursLabel(totalMinutes)}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("statistics.time.avgPerDay", { value: hoursLabel(avgPerDay) })}
            </span>
          </div>

          <ul className="space-y-2.5">
            {rows.map((r) => (
              <li key={r.habitId} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">{nameOf(r.habitId)}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {hoursLabel(r.totalMinutes)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${maxMinutes ? (r.totalMinutes / maxMinutes) * 100 : 0}%`,
                      backgroundColor: colorOf(r.habitId),
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </MotionCard>
  );
}
