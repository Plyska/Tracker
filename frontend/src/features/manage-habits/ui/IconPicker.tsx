import { Ban } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HABIT_ICON_NAMES, HabitIcon } from "@/entities/habit";
import { cn } from "@/shared/lib";

interface IconPickerProps {
  value: string | null;
  onChange: (icon: string | null) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const { t } = useTranslation();

  const cell = (selected: boolean) =>
    cn(
      "flex h-9 w-9 items-center justify-center rounded-md border outline-none transition-colors",
      "focus-visible:ring-2 focus-visible:ring-ring",
      selected
        ? "border-primary bg-accent text-accent-foreground"
        : "border-border hover:bg-accent hover:text-accent-foreground",
    );

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium">{t("habits.form.icon")}</span>
      <div className="grid grid-cols-8 gap-2">
        <button
          type="button"
          aria-label={t("habits.form.noIcon")}
          title={t("habits.form.noIcon")}
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          className={cell(value === null)}
        >
          <Ban className="h-4 w-4" />
        </button>
        {HABIT_ICON_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            aria-label={name}
            aria-pressed={value === name}
            onClick={() => onChange(name)}
            className={cell(value === name)}
          >
            <HabitIcon name={name} className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
