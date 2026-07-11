import { Link } from "react-router-dom";
import { NotebookPen } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  MoodPicker,
  useGetDailyLogsQuery,
  useUpsertDailyLogMutation,
} from "@/entities/daily-log";
import { paths } from "@/shared/config/paths";
import { cn, todayISODate } from "@/shared/lib";

/**
 * Швидке логування денного настрою — ряд із 5 облич (у хедері). Один лог на сьогодні (upsert).
 * Зміна настрою зберігає наявну нотатку. Кнопка-олівець веде в «Щоденник» для розгорнутого запису.
 */
export function MoodMenu() {
  const { t } = useTranslation();
  const today = todayISODate();

  const { data: logs } = useGetDailyLogsQuery({ from: today, to: today });
  const [upsert, { isLoading }] = useUpsertDailyLogMutation();
  const current = logs?.[0];
  const hasNote = !!current?.notes?.trim();

  return (
    <div className="flex items-center gap-2">
      {/* Підпис-підказка (на широких екранах) — пояснює, що це. */}
      <span className="hidden text-sm text-muted-foreground lg:inline">
        {t("mood.prompt")}
      </span>
      <MoodPicker
        value={current?.mood}
        disabled={isLoading}
        // Зберігаємо наявну нотатку, щоб зміна настрою її не стирала.
        onChange={(mood) =>
          void upsert({ date: today, mood, notes: current?.notes })
        }
      />
      <Link
        to={paths.diary}
        aria-label={t("mood.noteLabel")}
        title={t("mood.noteLabel")}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring",
          hasNote
            ? "text-primary hover:bg-accent"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <NotebookPen className="h-5 w-5" />
      </Link>
    </div>
  );
}
