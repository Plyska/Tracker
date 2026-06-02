import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { setAccent } from "../model/accentSlice";
import { ACCENTS } from "../model/accents";
import { cn } from "@/shared/lib/cn";

export function AccentPicker() {
  const { t } = useTranslation();
  const accent = useAppSelector((s) => s.accent.value);
  const dispatch = useAppDispatch();

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold">{t("settings.accent.title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("settings.accent.description")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ACCENTS.map((option) => {
          const isSelected = option.key === accent;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => dispatch(setAccent(option.key))}
              aria-pressed={isSelected}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-3 text-sm font-medium",
                "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: option.swatch }}
              >
                {isSelected && <Check className="h-4 w-4 text-white" />}
              </span>
              <span className="w-full truncate text-center">
                {t(`accents.${option.key}`)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
