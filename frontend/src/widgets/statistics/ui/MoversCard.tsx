import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeftRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/app/store/hooks";
import { buildMovers, useStatsData, type HabitMover } from "@/features/stats-period";
import { Card, InfoHint, Skeleton } from "@/shared/ui";
import { DeltaBadge } from "./DeltaBadge";

const MotionCard = motion.create(Card);

function MoverRow({ mover }: { mover: HabitMover }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="min-w-0 truncate text-sm">{mover.name}</span>
      <DeltaBadge delta={mover.delta} format="pp" className="shrink-0" />
    </li>
  );
}

/**
 * Per-habit movers: які звички помітно зросли/просіли vs попередній період (за habitBreakdown).
 * Гейти вибірки/порога — у buildMovers. Недоступно для «весь час» / замало історії → empty-state.
 */
export function MoversCard() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const scale = useAppSelector((s) => s.statsPeriod.scale);
  const { stats, prev, habits, isLoading, comparison, key } = useStatsData(
    undefined,
    { withComparison: true },
  );

  if (isLoading || !stats)
    return <Skeleton className="h-64 rounded-xl lg:h-full" />;

  const title = t("statistics.movers.title");
  const info = t("statistics.movers.info");

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

  const { improved, declined } = buildMovers(stats, prev, habits);
  const hasAny = improved.length > 0 || declined.length > 0;

  return (
    <MotionCard
      key={key}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col gap-4 p-4 sm:p-5 lg:h-full"
    >
      <Header title={title} info={info} />

      {!hasAny ? (
        <p className="text-sm text-muted-foreground">{t("statistics.movers.empty")}</p>
      ) : (
        <div className="space-y-4">
          {improved.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t("statistics.movers.improved")}
              </p>
              <ul className="space-y-2">
                {improved.map((m) => (
                  <MoverRow key={m.habitId} mover={m} />
                ))}
              </ul>
            </div>
          )}
          {declined.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t("statistics.movers.declined")}
              </p>
              <ul className="space-y-2">
                {declined.map((m) => (
                  <MoverRow key={m.habitId} mover={m} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </MotionCard>
  );
}

function Header({ title, info }: { title: string; info: string }) {
  return (
    <div className="flex items-center gap-2">
      <ArrowLeftRight className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <h3 className="text-sm font-semibold">{title}</h3>
      <InfoHint label={info} className="ml-auto" />
    </div>
  );
}
