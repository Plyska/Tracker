import { useState } from "react";
import { DropdownMenu } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { useGetHabitsQuery } from "@/entities/habit";
import {
  setStatsHabit,
  setStatsScale,
  type StatsScale,
} from "@/features/stats-period";
import { Button } from "@/shared/ui";
import { cn, useEntitlement } from "@/shared/lib";

const SCALES: StatsScale[] = ["week", "month", "year", "all"];
// Розширені масштаби — за Pro (advanced-stats). На релізі MOCK_PLAN='pro' → відкрито всім.
const ADVANCED_SCALES = new Set<StatsScale>(["year", "all"]);

const itemClass = cn(
  "flex cursor-pointer items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm outline-none",
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
);

/** Керування переглядом статистики: масштаб (week/month/year/all) + фільтр по звичці. */
export function StatsToolbar() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const reduceMotion = useReducedMotion();
  const scale = useAppSelector((s) => s.statsPeriod.scale);
  const habitId = useAppSelector((s) => s.statsPeriod.habitId);
  const advanced = useEntitlement("advanced-stats");

  const { data: habits = [] } = useGetHabitsQuery();
  const activeHabit = habits.find((h) => h.id === habitId);
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* --- Масштаб --- */}
      <div
        role="group"
        aria-label={t("statistics.scale.label")}
        className="flex w-full rounded-md border border-border bg-muted p-0.5 sm:inline-flex sm:w-auto"
      >
        {SCALES.map((value) => {
          const active = value === scale;
          const locked = ADVANCED_SCALES.has(value) && !advanced;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              disabled={locked}
              onClick={() => dispatch(setStatsScale(value))}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-1 rounded-[5px] px-3 py-1 text-sm font-medium transition-colors sm:flex-none",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                active
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="stats-scale-pill"
                  className="absolute inset-0 rounded-[5px] bg-primary shadow-card"
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 420, damping: 34 }
                  }
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                {t(`statistics.scale.${value}`)}
                {locked && <Lock className="h-3 w-3" aria-hidden />}
              </span>
            </button>
          );
        })}
      </div>

      {/* --- Фільтр по звичці --- */}
      <DropdownMenu.Root open={filterOpen} onOpenChange={setFilterOpen}>
        <DropdownMenu.Trigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between gap-2 sm:w-auto">
            <span className="truncate">
              {activeHabit ? activeHabit.name : t("statistics.filter.all")}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal forceMount>
          <AnimatePresence>
            {filterOpen && (
              <DropdownMenu.Content asChild forceMount align="end" sideOffset={6}>
                {/* Поява як у UserMenu/HabitRowMenu: fade + scale-pop від тригера. */}
                <motion.div
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  style={{
                    transformOrigin:
                      "var(--radix-dropdown-menu-content-transform-origin)",
                  }}
                  className="z-50 min-w-48 max-w-64 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-card"
                >
                  <DropdownMenu.Item
                    className={itemClass}
                    onSelect={() => dispatch(setStatsHabit(null))}
                  >
                    <span>{t("statistics.filter.all")}</span>
                    {!habitId && <Check className="h-4 w-4" aria-hidden />}
                  </DropdownMenu.Item>
                  {habits.map((h) => (
                    <DropdownMenu.Item
                      key={h.id}
                      className={itemClass}
                      onSelect={() => dispatch(setStatsHabit(h.id))}
                    >
                      <span className="truncate">{h.name}</span>
                      {habitId === h.id && (
                        <Check className="h-4 w-4 shrink-0" aria-hidden />
                      )}
                    </DropdownMenu.Item>
                  ))}
                </motion.div>
              </DropdownMenu.Content>
            )}
          </AnimatePresence>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
