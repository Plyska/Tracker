import type { ReactNode } from "react";
import {
  Award,
  Flame,
  Percent,
  Smile,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/app/store/hooks";
import { useStatsData } from "@/features/stats-period";
import { Card, Skeleton } from "@/shared/ui";
import { DeltaBadge } from "./DeltaBadge";

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6";

function Metric({
  Icon,
  label,
  value,
  hint,
  delta,
}: {
  Icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  delta?: ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col gap-2 p-4">
      <div className="flex items-start gap-2 text-muted-foreground">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span className="text-xs font-medium tracking-wide uppercase leading-tight">
          {label}
        </span>
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {delta}
      {hint && <div className="truncate text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

/**
 * Картки-метрики за вибраним періодом (Streak — «now»-факт по всій історії). Конфіг-масив —
 * щоб згодом легко додавати метрики й керувати видимістю (Фаза 7). Анімація: на відкритті/зміні
 * фільтра картки виїжджають збоку зі stagger (контейнер keyed по запиту → переанімовується).
 *
 * Під метриками, прив'язаними до періоду (виконання/ідеальні дні/настрій), показуємо дельту
 * vs попередній rolling-період (коли доступно — не для «весь час»). Streak-метрики не порівнюємо.
 */
export function MetricCards() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const scale = useAppSelector((s) => s.statsPeriod.scale);
  const { stats, isLoading, habits, comparison, key } = useStatsData(undefined, {
    withComparison: true,
  });

  if (isLoading || !stats) {
    return (
      <div className={GRID}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const pct = (r: number) => `${Math.round(r * 100)}%`;
  const days = (n: number) => t("statistics.unit.days", { count: n });
  const bestHabitName = stats.bestHabit
    ? habits.find((h) => h.id === stats.bestHabit!.habitId)?.name
    : undefined;

  // Підпис «vs минулий <період>» під дельтою (лише для week/month/year, де порівняння є).
  const cmp = comparison?.available ? comparison : null;
  const vsLabel = cmp ? t(`statistics.comparison.vsPrevious.${scale}`) : "";
  const withVs = (badge: ReactNode): ReactNode => (
    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
      {badge}
      <span className="text-[11px] text-muted-foreground">{vsLabel}</span>
    </div>
  );

  const metrics: {
    key: string;
    Icon: LucideIcon;
    value: ReactNode;
    hint?: string;
    delta?: ReactNode;
  }[] = [
    {
      key: "completion",
      Icon: Percent,
      value: pct(stats.completionRate),
      delta: cmp
        ? withVs(<DeltaBadge delta={cmp.completionRateDelta} format="pct" />)
        : undefined,
    },
    { key: "currentStreak", Icon: Flame, value: days(stats.currentStreak) },
    { key: "longestStreak", Icon: Award, value: days(stats.longestStreak) },
    {
      key: "perfectDays",
      Icon: Sparkles,
      value: days(stats.perfectDays),
      delta: cmp
        ? withVs(<DeltaBadge delta={cmp.perfectDaysDelta} format="int" />)
        : undefined,
    },
    {
      key: "bestHabit",
      Icon: Trophy,
      value: bestHabitName ?? "—",
      hint: stats.bestHabit ? pct(stats.bestHabit.completionRate) : undefined,
    },
    {
      key: "moodAverage",
      Icon: Smile,
      value: stats.moodAverage != null ? `${stats.moodAverage.toFixed(1)}/5` : "—",
      hint: stats.moodDays > 0 ? days(stats.moodDays) : undefined,
      delta:
        cmp && cmp.moodAverageDelta != null
          ? withVs(<DeltaBadge delta={cmp.moodAverageDelta} format="mood" />)
          : undefined,
    },
  ];

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.05 } },
  };
  const item: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, x: -24 },
    show: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      key={key}
      variants={container}
      initial="hidden"
      animate="show"
      className={GRID}
    >
      {metrics.map((m) => (
        <motion.div key={m.key} variants={item}>
          <Metric
            Icon={m.Icon}
            label={t(`statistics.metric.${m.key}`)}
            value={m.value}
            hint={m.hint}
            delta={m.delta}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
