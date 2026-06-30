import { useMemo } from "react";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStatsData } from "@/features/stats-period";
import { Card, InfoHint, Skeleton } from "@/shared/ui";
import {
  cn,
  getDateFnsLocale,
  isFutureDay,
  toISODate,
  useEntitlement,
} from "@/shared/lib";

/** Колір клітинки за часткою виконання (5 рівнів). null = поза життям звичок / немає що рахувати. */
function cellClass(ratio: number | null): string {
  if (ratio == null) return "bg-accent/30";
  if (ratio === 0) return "bg-accent/60";
  if (ratio <= 0.25) return "bg-primary/25";
  if (ratio <= 0.5) return "bg-primary/45";
  if (ratio <= 0.75) return "bg-primary/70";
  return "bg-primary";
}

const MotionCard = motion.create(Card);

const WEEKDAY_ROWS = [1, 3, 5]; // підписуємо Пн/Ср/Пт (інакше тісно)

/** Річний heatmap-календар активності (GitHub-style). Завжди масштаб «рік». За Pro (advanced-stats). */
export function Heatmap() {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateFnsLocale(i18n.language);
  const advanced = useEntitlement("advanced-stats");
  const reduce = useReducedMotion();
  const { stats, isLoading, key } = useStatsData("year");

  // date → ratio (total>0 ? completed/total : null).
  const ratioByDate = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const d of stats?.daily ?? []) {
      m.set(d.date, d.total > 0 ? d.completed / d.total : null);
    }
    return m;
  }, [stats]);

  // Тижні-колонки: від понеділка на/до `from` до `to`, по 7 днів (Пн→Нд).
  const weeks = useMemo(() => {
    if (!stats?.daily.length) return [];
    const first = parseISO(stats.daily[0].date);
    const last = parseISO(stats.daily[stats.daily.length - 1].date);
    const gridStart = startOfWeek(first, { weekStartsOn: 1 });
    const out: { date: string; inRange: boolean; future: boolean }[][] = [];
    let cursor = gridStart;
    while (cursor <= last) {
      const week = Array.from({ length: 7 }, (_, i) => {
        const day = addDays(cursor, i);
        const iso = toISODate(day);
        return {
          date: iso,
          inRange: ratioByDate.has(iso),
          future: isFutureDay(day),
        };
      });
      out.push(week);
      cursor = addDays(cursor, 7);
    }
    return out;
  }, [stats, ratioByDate]);

  if (!advanced) {
    return (
      <Card className="flex items-center gap-3 text-sm text-muted-foreground">
        <Lock className="h-4 w-4 shrink-0" aria-hidden />
        <span>{t("statistics.heatmap.locked")}</span>
      </Card>
    );
  }

  if (isLoading || !stats) {
    return <Skeleton className="h-44 rounded-xl" />;
  }

  return (
    <MotionCard
      key={key}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-3 p-4 sm:p-5"
    >
      <div className="flex items-center gap-1.5">
        <h3 className="text-sm font-semibold">{t("statistics.heatmap.title")}</h3>
        <InfoHint label={t("statistics.heatmap.info")} />
      </div>
      <div className="overflow-x-auto">
        <div className="flex w-full gap-2">
          {/* підписи днів тижня */}
          <div className="flex shrink-0 flex-col gap-[3px] pt-0.5 text-[10px] text-muted-foreground">
            {Array.from({ length: 7 }).map((_, row) => (
              <div key={row} className="flex h-4 items-center">
                {WEEKDAY_ROWS.includes(row)
                  ? format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), row), "EEEEEE", {
                      locale: dateLocale,
                    })
                  : ""}
              </div>
            ))}
          </div>
          {/* сітка тижнів — колонки розтягуються (flex-1), щоб заповнити ширину картки;
              min-w лишає горизонтальний скрол на вузьких екранах */}
          <div className="flex flex-1 gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex min-w-2 flex-1 flex-col gap-[3px]">
                {week.map((day) => {
                  const ratio = day.inRange ? (ratioByDate.get(day.date) ?? null) : undefined;
                  // поза діапазоном/майбутнє — порожня клітинка-плейсхолдер
                  const empty = ratio === undefined || day.future;
                  return (
                    <div
                      key={day.date}
                      title={
                        empty
                          ? day.date
                          : `${day.date} — ${
                              ratio == null ? "—" : `${Math.round(ratio * 100)}%`
                            }`
                      }
                      className={cn(
                        "h-4 w-full rounded-[3px]",
                        empty ? "bg-transparent" : cellClass(ratio ?? null),
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* легенда */}
      <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        <span>{t("statistics.heatmap.less")}</span>
        {["bg-accent/60", "bg-primary/25", "bg-primary/45", "bg-primary/70", "bg-primary"].map(
          (c) => (
            <span key={c} className={cn("h-3 w-3 rounded-[3px]", c)} />
          ),
        )}
        <span>{t("statistics.heatmap.more")}</span>
      </div>
    </MotionCard>
  );
}
