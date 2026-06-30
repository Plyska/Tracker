import { ArrowDownRight, ArrowUpRight, HeartPulse } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useStatsData } from "@/features/stats-period";
import { Card, InfoHint, Skeleton } from "@/shared/ui";
import { cn } from "@/shared/lib";

const MotionCard = motion.create(Card);

/**
 * Mood-кореляція «звичка ↔ настрій»: різниця середнього настрою в дні виконання vs ні.
 * Формулювання «пов'язано з» (кореляція ≠ причинність). Бекенд уже відсіює слабкі вибірки
 * (<5 днів у будь-якій групі) і віддає топ-3 → тут лише рендеримо або показуємо «мало даних».
 */
export function MoodCorrelationCard() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const { stats, isLoading, habits, key } = useStatsData();

  if (isLoading || !stats) return <Skeleton className="h-64 rounded-xl" />;

  const items = stats.moodCorrelations;
  const mvc = stats.moodVsCompletion;
  const hasData = items.length > 0 || mvc != null;

  // Напрям звʼязку «виконання ↔ настрій». Малу різницю (<0.3 бала) трактуємо як «звʼязку немає»,
  // щоб не видавати шум за інсайт.
  const mvcFlat = mvc ? Math.abs(mvc.delta) < 0.3 : false;
  const mvcUp = mvc ? mvc.delta > 0 : false;

  return (
    <MotionCard
      key={key}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-4 p-4 sm:p-5 lg:h-full"
    >
      <div className="flex items-center gap-2">
        <HeartPulse className="h-4 w-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold">{t("statistics.mood.title")}</h3>
        <InfoHint label={t("statistics.mood.info")} className="ml-auto" />
      </div>

      {!hasData ? (
        <p className="text-sm text-muted-foreground">{t("statistics.mood.empty")}</p>
      ) : (
        <>
          {/* Агрегатний звʼязок: загальне виконання за день ↔ настрій (спрямоване формулювання). */}
          {mvc && (
            <div className="rounded-md border border-border bg-accent/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {t("statistics.mood.completionTitle")}
                </p>
                {!mvcFlat && (
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums",
                      mvcUp
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {mvcUp ? (
                      <ArrowUpRight className="h-4 w-4" aria-hidden />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" aria-hidden />
                    )}
                    {mvcUp ? "+" : "−"}
                    {Math.abs(mvc.delta).toFixed(1)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm">
                {t(
                  mvcFlat
                    ? "statistics.mood.completionFlat"
                    : mvcUp
                      ? "statistics.mood.completionUp"
                      : "statistics.mood.completionDown",
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("statistics.mood.completionBasis", { count: mvc.sampleDays })}
              </p>
            </div>
          )}

          {items.length > 0 && (
            <ul className="space-y-3">
          {items.map((c) => {
            const up = c.delta >= 0;
            const name = habits.find((h) => h.id === c.habitId)?.name ?? "—";
            return (
              <li key={c.habitId} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("statistics.mood.samples", {
                      withCount: c.sampleWith,
                      withoutCount: c.sampleWithout,
                    })}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums",
                    up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                  )}
                  title={t(up ? "statistics.mood.higher" : "statistics.mood.lower")}
                >
                  {up ? (
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" aria-hidden />
                  )}
                  {up ? "+" : "−"}
                  {Math.abs(c.delta).toFixed(1)}
                </div>
              </li>
            );
              })}
            </ul>
          )}
        </>
      )}
      {hasData && (
        <p className="text-[11px] text-muted-foreground">
          {t("statistics.mood.disclaimer")}
        </p>
      )}
    </MotionCard>
  );
}
