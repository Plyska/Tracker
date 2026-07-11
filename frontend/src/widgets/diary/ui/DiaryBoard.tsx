import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Plus } from "lucide-react";
import { useGetDiaryFeedQuery, type DailyLog } from "@/entities/daily-log";
import { Button, Skeleton } from "@/shared/ui";
import { todayISODate } from "@/shared/lib";
import { useDelayedFlag } from "@/shared/lib/hooks/useDelayedFlag";
import { DiaryPageCard } from "./DiaryPageCard";
import { DiaryDialog } from "./DiaryDialog";

const GRID = "grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3";

/** Дошка щоденника: тулбар (кнопка «Новий запис») + сітка карток-«сторінок» (новіші вперше). */
export function DiaryBoard() {
  const { t } = useTranslation();
  const { data: feed = [], isLoading } = useGetDiaryFeedQuery();
  const showSkeleton = useDelayedFlag(isLoading);
  // Дата, відкрита в модалці (null → закрито). Стрілки/клавіші гортають дні всередині.
  const [openDate, setOpenDate] = useState<string | null>(null);

  const existingByDate = useMemo(
    () => Object.fromEntries(feed.map((l) => [l.date, l])),
    [feed],
  ) as Record<string, DailyLog>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setOpenDate(todayISODate())}>
          <Plus className="h-4 w-4" />
          {t("diary.newEntry")}
        </Button>
      </div>

      {showSkeleton ? (
        <div className={GRID} role="status" aria-busy="true">
          <span className="sr-only">{t("common.loading")}</span>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : feed.length > 0 ? (
        <div className={GRID}>
          {feed.map((log) => (
            <DiaryPageCard
              key={log.date}
              log={log}
              onOpen={() => setOpenDate(log.date)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <BookOpen className="h-6 w-6" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">{t("diary.emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("diary.empty")}</p>
          </div>
          <Button onClick={() => setOpenDate(todayISODate())}>
            <Plus className="h-4 w-4" />
            {t("diary.newEntry")}
          </Button>
        </div>
      )}

      <DiaryDialog
        open={openDate !== null}
        initialDate={openDate ?? todayISODate()}
        existingByDate={existingByDate}
        onOpenChange={(o) => !o && setOpenDate(null)}
      />
    </div>
  );
}
