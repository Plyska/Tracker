import { useTranslation } from "react-i18next";
import { HabitGlyph } from "@/entities/habit";

interface HabitPreviewProps {
  name: string;
  color: string;
  icon: string | null;
}

/**
 * Живий прев'ю чіпа навички (гліф + назва) — як вона виглядатиме в таблиці. Реагує на зміну
 * назви/кольору/іконки у формі. Винесено окремо, щоб перевикористати й тримати HabitDialog чистим.
 */
export function HabitPreview({ name, color, icon }: HabitPreviewProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
      <HabitGlyph
        name={name || "?"}
        color={color}
        icon={icon}
        className="h-10 w-10"
        iconClassName="h-5 w-5"
      />
      <span className="truncate text-sm font-medium">
        {name || t("habits.form.preview")}
      </span>
    </div>
  );
}
