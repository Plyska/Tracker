import { Angry, Frown, Meh, Smile, Laugh, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useGetDailyLogsQuery,
  useUpsertDailyLogMutation,
} from "@/entities/daily-log";
import { cn, todayISODate } from "@/shared/lib";

/** 1–5 → іконка-обличчя + ключ підпису (mood.scale.*). */
const MOODS: { value: number; Icon: LucideIcon; key: string }[] = [
  { value: 1, Icon: Angry, key: "awful" },
  { value: 2, Icon: Frown, key: "bad" },
  { value: 3, Icon: Meh, key: "okay" },
  { value: 4, Icon: Smile, key: "good" },
  { value: 5, Icon: Laugh, key: "great" },
];

/**
 * Логування денного настрою — статичний ряд із 5 облич (без анімацій/поповерів), як перший варіант.
 * Живе у DashboardToolbar. Один лог на сьогодні (sparse, upsert). На статистику впливає лише
 * значення настрою (1–5), тож нотатки немає.
 */
export function MoodMenu() {
  const { t } = useTranslation();
  const today = todayISODate();

  const { data: logs } = useGetDailyLogsQuery({ from: today, to: today });
  const [upsert, { isLoading }] = useUpsertDailyLogMutation();
  const current = logs?.[0];

  return (
    <div className="flex items-center gap-2">
      {/* Підпис-підказка (на широких екранах) — пояснює, що це. */}
      <span className="hidden text-sm text-muted-foreground lg:inline">
        {t("mood.prompt")}
      </span>
      <div
        role="group"
        aria-label={t("mood.prompt")}
        className="flex items-center gap-0.5"
      >
        {MOODS.map(({ value, Icon, key }) => {
          const active = current?.mood === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              aria-label={t(`mood.scale.${key}`)}
              title={t(`mood.scale.${key}`)}
              disabled={isLoading}
              onClick={() => void upsert({ date: today, mood: value })}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
