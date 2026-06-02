import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PRESET_HABIT_COLORS } from "@/entities/habit";
import { cn } from "@/shared/lib";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

/** Pro: пресети + довільний hex через нативний colorpicker. */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const { t } = useTranslation();
  const isPreset = PRESET_HABIT_COLORS.includes(
    value as (typeof PRESET_HABIT_COLORS)[number],
  );

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{t("habits.form.color")}</span>
      <div className="flex flex-wrap items-center gap-2">
        {PRESET_HABIT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={color}
            aria-pressed={value === color}
            onClick={() => onChange(color)}
            style={{ backgroundColor: color }}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
              value === color &&
                "ring-2 ring-ring ring-offset-2 ring-offset-card",
            )}
          >
            {value === color && <Check className="h-4 w-4 text-white" />}
          </button>
        ))}
        <label
          className={cn(
            "relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-border",
            !isPreset && "ring-2 ring-ring ring-offset-2 ring-offset-card",
          )}
          style={!isPreset ? { backgroundColor: value } : undefined}
          title={t("habits.form.customColor")}
        >
          {isPreset && (
            <span
              className="h-4 w-4 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)",
              }}
            />
          )}
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
}
