import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib";
import { MOODS } from "../model/moods";

interface MoodPickerProps {
  /** Обране значення настрою (1–5) або `undefined`. */
  value?: number;
  onChange: (mood: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const SIZES = {
  sm: { btn: "h-8 w-8", icon: "h-4 w-4" },
  md: { btn: "h-9 w-9", icon: "h-5 w-5" },
} as const;

/**
 * Керований ряд із 5 облич-настроїв (1–5). Презентаційний примітив сутності —
 * повторно використовується у пікері хедера, композері та картках щоденника.
 */
export function MoodPicker({
  value,
  onChange,
  disabled,
  size = "md",
  className,
}: MoodPickerProps) {
  const { t } = useTranslation();
  const s = SIZES[size];

  return (
    <div
      role="group"
      aria-label={t("mood.prompt")}
      className={cn("flex items-center gap-0.5", className)}
    >
      {MOODS.map(({ value: v, Icon, key }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={active}
            aria-label={t(`mood.scale.${key}`)}
            title={t(`mood.scale.${key}`)}
            disabled={disabled}
            onClick={() => onChange(v)}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
              s.btn,
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className={s.icon} />
          </button>
        );
      })}
    </div>
  );
}
