import { useState } from "react";
import { DropdownMenu } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Pencil, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { setStatsGoal } from "@/features/ui-prefs";
import { useStatsData } from "@/features/stats-period";
import { Button, Card, IconButton, InfoHint, Skeleton } from "@/shared/ui";
import { cn } from "@/shared/lib";

const MotionCard = motion.create(Card);
const PRESETS = [50, 60, 70, 80, 90, 100];

const RING = 112; // px
const STROKE = 10;
const R = (RING - STROKE) / 2;
const C = 2 * Math.PI * R;

const itemClass = cn(
  "flex cursor-pointer items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm outline-none",
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
);

/** Кільце прогресу completionRate → ціль. Заповнення = поточне/ціль (капнуте на 100%). */
function Ring({ progress, pct, reached }: { progress: number; pct: number; reached: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative" style={{ width: RING, height: RING }}>
      <svg width={RING} height={RING} className="-rotate-90">
        <circle
          cx={RING / 2}
          cy={RING / 2}
          r={R}
          fill="none"
          stroke="var(--border)"
          strokeWidth={STROKE}
        />
        <motion.circle
          cx={RING / 2}
          cy={RING / 2}
          r={R}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          className={cn(
            reached ? "text-emerald-500 dark:text-emerald-400" : "text-primary",
          )}
          stroke="currentColor"
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - progress) }}
          transition={reduce ? { duration: 0 } : { duration: 0.6, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {reached ? (
          <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        ) : null}
        <span className="text-2xl font-semibold tabular-nums">{pct}%</span>
      </div>
    </div>
  );
}

/**
 * Ціль виконання: користувач задає цільовий % (персиститься в ui-prefs), картка показує кільце
 * прогресу поточного періоду до цілі. Редагування — дропдаун пресетів + «Без цілі». Немає цілі → CTA.
 */
export function GoalCard() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const dispatch = useAppDispatch();
  const goal = useAppSelector((s) => s.uiPrefs.statsGoalPct);
  const { stats, isLoading, key } = useStatsData();
  const [open, setOpen] = useState(false);

  if (isLoading || !stats) return <Skeleton className="h-64 rounded-xl lg:h-full" />;

  const pct = Math.round(stats.completionRate * 100);
  const reached = goal != null && pct >= goal;
  const progress = goal ? Math.min(pct / goal, 1) : 0;

  return (
    <MotionCard
      key={key}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col gap-4 p-4 sm:p-5 lg:h-full"
    >
      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold">{t("statistics.goal.title")}</h3>
          <InfoHint label={t("statistics.goal.info")} className="ml-auto" />
          {goal != null && (
            <DropdownMenu.Trigger asChild>
              <IconButton size="sm" aria-label={t("statistics.goal.edit")}>
                <Pencil className="h-4 w-4" />
              </IconButton>
            </DropdownMenu.Trigger>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-2">
          {goal == null ? (
            <>
              <p className="text-center text-sm text-muted-foreground">
                {t("statistics.goal.prompt")}
              </p>
              {/* Тригер-CTA: коли цілі немає, відкриваємо той самий дропдаун звідси. */}
              <DropdownMenu.Trigger asChild>
                <Button variant="outline" size="sm">
                  {t("statistics.goal.set")}
                </Button>
              </DropdownMenu.Trigger>
            </>
          ) : (
            <>
              <Ring progress={progress} pct={pct} reached={reached} />
              <p className="text-center text-sm">
                {reached ? (
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {t("statistics.goal.reached")}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {t("statistics.goal.remaining", { pct: goal - pct })}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("statistics.goal.target", { pct: goal })}
              </p>
            </>
          )}
        </div>

        <DropdownMenu.Portal forceMount>
          <AnimatePresence>
            {open && (
              <DropdownMenu.Content asChild forceMount align="end" sideOffset={6}>
                <motion.div
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  style={{
                    transformOrigin: "var(--radix-dropdown-menu-content-transform-origin)",
                  }}
                  className="z-50 min-w-40 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-card"
                >
                  {PRESETS.map((value) => (
                    <DropdownMenu.Item
                      key={value}
                      className={itemClass}
                      onSelect={() => dispatch(setStatsGoal(value))}
                    >
                      <span>{value}%</span>
                      {goal === value && <Check className="h-4 w-4" aria-hidden />}
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <DropdownMenu.Item
                    className={itemClass}
                    onSelect={() => dispatch(setStatsGoal(null))}
                  >
                    <span>{t("statistics.goal.none")}</span>
                    {goal == null && <Check className="h-4 w-4" aria-hidden />}
                  </DropdownMenu.Item>
                </motion.div>
              </DropdownMenu.Content>
            )}
          </AnimatePresence>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </MotionCard>
  );
}
