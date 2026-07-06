import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarCheck,
  Flame,
  RotateCcw,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  buildMilestones,
  useStatsData,
  type Milestone,
} from "@/features/stats-period";
import { Card, InfoHint, Skeleton } from "@/shared/ui";

const MotionCard = motion.create(Card);

const ICON: Record<Milestone["kind"], LucideIcon> = {
  newRecord: Trophy,
  streak: Flame,
  almostRecord: Flame,
  perfectWeek: CalendarCheck,
  comeback: RotateCcw,
  perfectDays: Sparkles,
};

/**
 * Досягнення/рекорди: нові рекорди серій, бейджі серій (7/30/100…), «майже рекорд»,
 * ідеальний тиждень (7 днів поспіль), камбек після паузи та наступна віха ідеальних днів.
 * Логіка добору — `buildMilestones` (все з наявної статистики, без бекенду). Якщо пунктів
 * більше, ніж уміщається — список скролиться всередині віджета без зміни його висоти.
 */
export function MilestonesCard() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const { stats, habits, isLoading, key } = useStatsData();

  if (isLoading || !stats)
    return <Skeleton className="h-64 rounded-xl lg:h-full" />;

  const items = buildMilestones(stats, habits);

  const titleOf = (m: Milestone) => {
    switch (m.kind) {
      case "newRecord":
        return t("statistics.milestones.newRecord", { name: m.habitName });
      case "streak":
        return t("statistics.milestones.streak", {
          name: m.habitName,
          count: m.badge,
          context: m.unit,
        });
      case "almostRecord":
        return t("statistics.milestones.almostRecord", { name: m.habitName });
      case "perfectWeek":
        return t("statistics.milestones.perfectWeek");
      case "comeback":
        return t("statistics.milestones.comeback");
      case "perfectDays":
        return t("statistics.milestones.perfectDays");
    }
  };

  const subOf = (m: Milestone) => {
    switch (m.kind) {
      case "newRecord":
        return t("statistics.milestones.newRecordSub", {
          count: m.current,
          context: m.unit,
        });
      case "streak":
        return m.target
          ? t("statistics.milestones.streakSub", {
              current: m.current,
              target: m.target,
              context: m.unit,
            })
          : t("statistics.milestones.streakSubMax", {
              count: m.current,
              context: m.unit,
            });
      case "almostRecord":
        return t("statistics.milestones.almostRecordSub", {
          current: m.current,
          target: m.target,
          context: m.unit,
        });
      case "perfectWeek":
        return m.achieved
          ? t("statistics.milestones.perfectWeekDone", { count: m.current })
          : t("statistics.milestones.perfectWeekSub", {
              current: m.current,
              target: m.target,
            });
      case "comeback":
        return t("statistics.milestones.comebackSub", { count: m.daysOff });
      case "perfectDays":
        return t("statistics.milestones.perfectDaysSub", {
          current: m.current,
          target: m.target,
        });
    }
  };

  // Прогрес-бар лише там, де є ціль, до якої ще йдемо (не для рекорду/камбека/виконаного тижня).
  const hasBar = (m: Milestone) =>
    m.remaining != null && m.remaining > 0 && m.target != null;

  const badgeOf = (m: Milestone) => {
    if (m.kind === "newRecord") return "🏆";
    if (m.kind === "perfectWeek" && m.achieved) return "🎉";
    if (m.kind === "comeback") return "💪";
    if (m.remaining != null && m.remaining > 0)
      return t("statistics.milestones.toGo", { count: m.remaining });
    return "🔥"; // серія-бейдж без наступного порога
  };

  return (
    <MotionCard
      key={key}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col gap-4 p-4 sm:p-5 lg:h-full"
    >
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold">
          {t("statistics.milestones.title")}
        </h3>
        <InfoHint label={t("statistics.milestones.info")} className="ml-auto" />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("statistics.milestones.empty")}
        </p>
      ) : (
        // Фіксована висота списку: якщо пунктів більше — скрол усередині, віджет не росте.
        <ul className="-mr-1 max-h-72 flex-1 space-y-3 overflow-y-auto pr-1">
          {items.map((m) => {
            const Icon = ICON[m.kind];
            const showBar = hasBar(m);
            const fill = m.target
              ? Math.min(100, Math.round((m.current / m.target) * 100))
              : 0;
            return (
              <li key={m.id} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{titleOf(m)}</p>
                  <p className="text-xs text-muted-foreground">{subOf(m)}</p>
                  {showBar && (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${fill}%` }}
                      />
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">
                  {badgeOf(m)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </MotionCard>
  );
}
