import { Columns3, Rows3, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { cn } from "@/shared/lib";
import { AnimatedText } from "@/shared/ui";
import { setTableLayout, type TableLayout } from "../model/uiPrefsSlice";

const OPTIONS: { value: TableLayout; icon: typeof Columns3 }[] = [
  { value: "columns", icon: Columns3 },
  { value: "rows", icon: Rows3 },
];

/** Перемикач орієнтації таблиці навичок (Settings). Персиститься в ui-prefs. */
export function TableLayoutSwitcher() {
  const { t } = useTranslation();
  const tableLayout = useAppSelector((s) => s.uiPrefs.tableLayout);
  const dispatch = useAppDispatch();

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

      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map(({ value, icon: Icon }) => {
          const isSelected = value === tableLayout;
          return (
            <button
              key={value}
              type="button"
              onClick={() => dispatch(setTableLayout(value))}
              aria-pressed={isSelected}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm font-medium",
                "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex min-w-0 flex-col">
                <AnimatedText className="max-w-full truncate">
                  {t(`settings.tableLayout.${value}`)}
                </AnimatedText>
                {value === "rows" && (
                  <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-muted-foreground">
                    <Smartphone className="h-3 w-3 shrink-0" />
                    <AnimatedText className="max-w-full truncate">
                      {t("settings.tableLayout.rowsHint")}
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
