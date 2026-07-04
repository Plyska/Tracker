import { motion, useReducedMotion } from "framer-motion";
import { Waypoints } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStatsData } from "@/features/stats-period";
import { Card, InfoHint, Skeleton } from "@/shared/ui";
import { DeltaBadge } from "./DeltaBadge";

const MotionCard = motion.create(Card);

/**
 * Синергія звичок: у дні, коли виконано A, частка виконання B помітно вища/нижча за звичайну.
 * Показує «ключові» звички, що тягнуть інші. Дані/гейти — на бекенді (`habitSynergies`).
 */
export function SynergyCard() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const { stats, habits, isLoading, key } = useStatsData();

  if (isLoading || !stats)
    return <Skeleton className="h-64 rounded-xl lg:h-full" />;

  const nameOf = (id: string) => habits.find((h) => h.id === id)?.name ?? "—";
  const pct = (r: number) => `${Math.round(r * 100)}%`;
  const synergies = stats.habitSynergies;
  const [top, ...rest] = synergies;

  return (
    <MotionCard
      key={key}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col gap-4 p-4 sm:p-5 lg:h-full"
    >
      <div className="flex items-center gap-2">
        <Waypoints className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold">{t("statistics.synergy.title")}</h3>
        <InfoHint label={t("statistics.synergy.info")} className="ml-auto" />
      </div>

      {!top ? (
        <p className="text-sm text-muted-foreground">
          {t("statistics.synergy.empty")}
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm font-medium">
              <span className="truncate">{nameOf(top.habitA)}</span>
              <span className="text-primary" aria-hidden>
                →
              </span>
              <span className="truncate">{nameOf(top.habitB)}</span>
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-semibold tabular-nums">
                {pct(top.rate)}
              </span>
              <DeltaBadge delta={top.delta} format="pct" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("statistics.synergy.baseline", { pct: pct(top.baseline) })}
            </p>
          </div>

          {rest.length > 0 && (
            <ul className="space-y-2 border-t border-border pt-3">
              {rest.map((s) => (
                <li
                  key={`${s.habitA}-${s.habitB}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex min-w-0 items-baseline gap-x-1.5">
                    <span className="truncate">{nameOf(s.habitA)}</span>
                    <span className="text-primary" aria-hidden>
                      →
                    </span>
                    <span className="truncate text-muted-foreground">
                      {nameOf(s.habitB)}
                    </span>
                  </span>
                  <DeltaBadge delta={s.delta} format="pct" className="shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </MotionCard>
  );
}
