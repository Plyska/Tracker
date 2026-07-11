import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { moodByValue, type DailyLog } from "@/entities/daily-log";
import { richTextToPlain } from "@/shared/ui/RichTextEditor";
import { cn, fromISODate, getDateFnsLocale, isToday } from "@/shared/lib";

/** Картка-«сторінка» щоденника у сітці: дата + настрій + прев'ю тексту. Клік → `onOpen`. */
export function DiaryPageCard({
  log,
  onOpen,
}: {
  log: DailyLog;
  onOpen: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = getDateFnsLocale(i18n.language);

  const day = fromISODate(log.date);
  const today = isToday(day);
  const mood = moodByValue(log.mood);
  const preview = richTextToPlain(log.notes ?? "");

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex min-h-40 flex-col rounded-xl border border-border bg-card p-4 text-left text-card-foreground shadow-card outline-none",
        "transition-[colors,transform] hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
      )}
    >
      {/* Заголовок: дата + настрій */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "text-sm font-semibold capitalize",
                today && "text-primary",
              )}
            >
              {format(day, "EEEE", { locale })}
            </span>
            {today && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            )}
          </div>
          <div className="text-xs tabular-nums text-muted-foreground">
            {format(day, "d MMMM yyyy", { locale })}
          </div>
        </div>
        {mood && (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
            title={t(`mood.scale.${mood.key}`)}
            aria-label={t(`mood.scale.${mood.key}`)}
          >
            <mood.Icon className="h-4 w-4" />
          </span>
        )}
      </div>

      {/* Прев'ю тексту */}
      <p className="line-clamp-5 whitespace-pre-line text-sm text-muted-foreground">
        {preview}
      </p>
    </button>
  );
}
