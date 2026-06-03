import { Columns3, Lock, Rows3, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { cn, useEntitlement } from "@/shared/lib";
import { AnimatedText } from "@/shared/ui";
import { setTableLayout, type TableLayout } from "../model/uiPrefsSlice";

// `columns` — дефолт для всіх; `rows` (вертикальний, краще на мобільному) — під Pro.
const OPTIONS: { value: TableLayout; icon: typeof Columns3; pro?: boolean }[] = [
  { value: "columns", icon: Columns3 },
  { value: "rows", icon: Rows3, pro: true },
];

/**
 * Перемикач орієнтації таблиці навичок (Settings). Персиститься в ui-prefs.
 * Вибір layout гейтиться за Pro (`table-layout`): Free бачить `rows` під замком.
 */
export function TableLayoutSwitcher() {
  const { t } = useTranslation();
  const tableLayout = useAppSelector((s) => s.uiPrefs.tableLayout);
  const canChooseLayout = useEntitlement("table-layout");
  const dispatch = useAppDispatch();

  // Без права на вибір — ефективно лишається `columns` (як у HabitTable).
  const selected = canChooseLayout ? tableLayout : "columns";

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold">
          <AnimatedText>{t("settings.tableLayout.title")}</AnimatedText>
        </h3>
        <p className="text-sm text-muted-foreground">
          <AnimatedText>{t("settings.tableLayout.description")}</AnimatedText>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OPTIONS.map(({ value, icon: Icon, pro }) => {
          const isSelected = value === selected;
          const locked = pro && !canChooseLayout;
          return (
            <button
              key={value}
              type="button"
              onClick={() => !locked && dispatch(setTableLayout(value))}
              disabled={locked}
              aria-pressed={isSelected}
              className={cn(
                "relative flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm font-medium",
                "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border hover:bg-accent hover:text-accent-foreground",
                locked && "cursor-not-allowed opacity-60 hover:bg-transparent",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5">
                  <AnimatedText className="max-w-full truncate">
                    {t(`settings.tableLayout.${value}`)}
                  </AnimatedText>
                  {locked && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      <Lock className="h-2.5 w-2.5" />
                      {t("common.pro")}
                    </span>
                  )}
                </span>
                {value === "rows" && (
                  <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-muted-foreground">
                    <Smartphone className="h-3 w-3 shrink-0" />
                    <AnimatedText className="max-w-full truncate">
                      {t(
                        locked
                          ? "settings.tableLayout.proHint"
                          : "settings.tableLayout.rowsHint",
                      )}
                    </AnimatedText>
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
