import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/app/store/hooks";
import { useStatsData } from "@/features/stats-period";
import { Card, InfoHint, Skeleton } from "@/shared/ui";
import { DeltaBadge } from "./DeltaBadge";

const MotionCard = motion.create(Card);

function Row({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="text-sm font-semibold tabular-nums">{value}</span>
        {delta}
      </span>
    </div>
  );
}

/**
 * Зведена картка динаміки: як поточний період виглядає проти попереднього rolling-вікна тієї ж
 * довжини. Метрики, прив'язані до періоду (виконання/ідеальні дні/настрій) + текстовий інсайт за
 * зміною виконання. Недоступно для «весь час» або коли історії замало (empty-state).
 */
export function ProgressCard() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const scale = useAppSelector((s) => s.statsPeriod.scale);
  const { stats, isLoading, comparison, key } = useStatsData(undefined, {
    withComparison: true,
  });

  if (isLoading || !stats)
    return <Skeleton className="h-64 rounded-xl lg:h-full" />;

  const title = t("statistics.progress.title");
  const info = t("statistics.progress.info");

  // Порівняння недоступне: «весь час» (немає попереднього періоду) або замало історії.
  if (!comparison?.available) {
    return (
      <MotionCard
        key={`empty-${scale}`}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex flex-col gap-3 p-4 sm:p-5 lg:h-full"
      >
        <Header title={title} info={info} />
        <p className="text-sm text-muted-foreground">
          {scale === "all"
            ? t("statistics.progress.notForAll")
            : t("statistics.progress.notEnough")}
        </p>
      </MotionCard>
    );
  }

  const cmp = comparison;
  const pct = (r: number) => `${Math.round(r * 100)}%`;

  // Інсайт за зміною виконання (в.п.): помітно краще / гірше / приблизно так само.
  const pp = Math.round(cmp.completionRateDelta * 100);
  const insightKey = pp >= 5 ? "up" : pp <= -5 ? "down" : "flat";

  return (
    <MotionCard
      key={key}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col gap-4 p-4 sm:p-5 lg:h-full"
    >
      <Header
        title={title}
        info={info}
        subtitle={t(`statistics.comparison.vsPrevious.${scale}`)}
      />

      <div className="space-y-2.5">
        <Row
          label={t("statistics.metric.completion")}
          value={pct(stats.completionRate)}
          delta={<DeltaBadge delta={cmp.completionRateDelta} format="pp" />}
        />
        <Row
          label={t("statistics.metric.perfectDays")}
          value={String(stats.perfectDays)}
          delta={<DeltaBadge delta={cmp.perfectDaysDelta} format="int" />}
        />
        {cmp.moodAverageDelta != null && stats.moodAverage != null && (
          <Row
            label={t("statistics.metric.moodAverage")}
            value={`${stats.moodAverage.toFixed(1)}/5`}
            delta={<DeltaBadge delta={cmp.moodAverageDelta} format="mood" />}
          />
        )}
      </div>

      <p className="text-sm">{t(`statistics.progress.insight.${insightKey}`)}</p>
    </MotionCard>
  );
}

function Header({
  title,
  info,
  subtitle,
}: {
  title: string;
  info: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <TrendingUp className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <h3 className="text-sm font-semibold">{title}</h3>
      {subtitle && (
        <span className="truncate text-xs text-muted-foreground">· {subtitle}</span>
      )}
      <InfoHint label={info} className="ml-auto" />
    </div>
  );
}
