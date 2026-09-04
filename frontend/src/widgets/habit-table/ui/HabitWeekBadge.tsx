import { useTranslation } from "react-i18next";
import { cn, minutesToHoursLabel } from "@/shared/lib";

/**
 * Тижневий бейдж прогресу для звички з ціллю (ADR 0010 + 0011). За поточний тиждень:
 *  - count-ціль: «N/ціль» (напр. «2/3»);
 *  - часова (`hours`): «Nгод/ціль» у годинах (current/target — у ХВИЛИНАХ, форматуються).
 * Досягнуто (current ≥ target) → акцентна заливка; перевиконання показуємо як є (ривок).
 */
export function HabitWeekBadge({
  current,
  target,
  hours = false,
}: {
  current: number;
  target: number;
  hours?: boolean;
}) {
  const { t } = useTranslation();
  const reached = current >= target;

  const text = hours
    ? `${minutesToHoursLabel(current)}/${minutesToHoursLabel(target)}${t("habits.hoursSuffix")}`
    : `${current}/${target}`;
  const title = hours
    ? t("habits.weekProgressHours", {
        current: minutesToHoursLabel(current),
        target: minutesToHoursLabel(target),
      })
    : t("habits.weekProgress", { count: current, target });

  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums",
        reached
          ? "bg-primary/15 text-primary"
          : "bg-muted text-muted-foreground",
      )}
      title={title}
      aria-label={title}
    >
      {text}
    </span>
  );
}
