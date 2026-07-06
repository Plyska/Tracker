import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib";

/**
 * Тижневий бейдж прогресу для звички з ціллю частоти: «N/ціль» за поточний тиждень.
 * Досягнуто (N ≥ ціль) → акцентна заливка; перевиконання показуємо як є (напр. «4/3» — ривок).
 */
export function HabitWeekBadge({
  count,
  target,
}: {
  count: number;
  target: number;
}) {
  const { t } = useTranslation();
  const reached = count >= target;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums",
        reached
          ? "bg-primary/15 text-primary"
          : "bg-muted text-muted-foreground",
      )}
      title={t("habits.weekProgress", { count, target })}
      aria-label={t("habits.weekProgress", { count, target })}
    >
      {count}/{target}
    </span>
  );
}
