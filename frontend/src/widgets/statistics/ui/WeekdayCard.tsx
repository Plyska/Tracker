import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, CalendarRange } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStatsData, weekdayInsights, type WeekdayCell } from "@/features/stats-period";
import { Card, InfoHint, Skeleton } from "@/shared/ui";
import { cn } from "@/shared/lib";

const MotionCard = motion.create(Card);

function Chip({
  tone,
  label,
  children,
}: {
  tone: "good" | "bad";
  label: string;
  children: ReactNode;
}) {
  const Icon = tone === "good" ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold tabular-nums",
        tone === "good"
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-600 dark:text-rose-400",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {children}
    </span>
  );
}

function Bar({ cell }: { cell: WeekdayCell }) {
  const pct = cell.completion != null ? Math.round(cell.completion * 100) : null;
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <div className="flex h-20 w-full items-end">
        <div
          title={
            pct != null
              ? `${cell.name} · ${pct}% · ${cell.days}`
              : cell.name
          }
          className={cn(
            "w-full rounded-t-sm",
            cell.completion != null && "min-h-[3px]",
            cell.isBest
              ? "bg-emerald-500 dark:bg-emerald-400"
              : cell.isWorst
                ? "bg-rose-500 dark:bg-rose-400"
                : "bg-primary/30",
          )}
          style={{ height: `${(cell.completion ?? 0) * 100}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground">{cell.short}</span>
    </div>
  );
}

/**
 * Профіль тижня: бар-чарт частки виконання по днях (Пн–Нд, найкращий/найгірший підсвічені) +
 * найкращий/найгірший день за настроєм. Усе з `daily[]` поточного періоду (frontend-only).
 * Замало даних / немає варіації → empty-state.
 */
export function WeekdayCard() {
  const { t, i18n } = useTranslation();
  const reduce = useReducedMotion();
  const { stats, isLoading, key } = useStatsData();

  if (isLoading || !stats) return <Skeleton className="h-64 rounded-xl lg:h-full" />;

  const title = t("statistics.weekday.title");
  const info = t("statistics.weekday.info");
  const insight = weekdayInsights(stats.daily, i18n.language);

  if (!insight || !insight.hasCompletion) {
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

  const best = insight.cells.find((c) => c.isBest);
  const worst = insight.cells.find((c) => c.isWorst);
  const pct = (c: WeekdayCell) => `${Math.round((c.completion ?? 0) * 100)}%`;

  return (
    <MotionCard
      key={key}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col gap-4 p-4 sm:p-5 lg:h-full"
    >
      <Header title={title} info={info} />

      {/* Бар-чарт Пн–Нд */}
      <div className="flex items-end gap-1.5">
        {insight.cells.map((c) => (
          <Bar key={c.weekday} cell={c} />
        ))}
      </div>

      {/* Найкращий / найгірший день виконання */}
      {best && worst && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Chip tone="good" label={`${t("statistics.weekday.best")}: ${best.name}`}>
            {best.name} · {pct(best)}
          </Chip>
          <Chip tone="bad" label={`${t("statistics.weekday.worst")}: ${worst.name}`}>
            {worst.name} · {pct(worst)}
          </Chip>
        </div>
      )}

      {/* Настрій по днях (коли є достатньо логів) */}
      {insight.bestMood && insight.worstMood && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">
            {t("statistics.weekday.moodLabel")}
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Chip
              tone="good"
              label={`${t("statistics.weekday.best")}: ${insight.bestMood.name}`}
            >
              {insight.bestMood.name} · {insight.bestMood.mood.toFixed(1)}
            </Chip>
            <Chip
              tone="bad"
              label={`${t("statistics.weekday.worst")}: ${insight.worstMood.name}`}
            >
              {insight.worstMood.name} · {insight.worstMood.mood.toFixed(1)}
            </Chip>
          </span>
        </div>
      )}
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
