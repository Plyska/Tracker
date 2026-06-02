import { cn } from "@/shared/lib";
import { HabitIcon } from "./HabitIcon";

interface HabitGlyphProps {
  name: string;
  color: string;
  icon?: string | null;
  className?: string;
  iconClassName?: string;
}

export function HabitGlyph({
  name,
  color,
  icon,
  className,
  iconClassName,
}: HabitGlyphProps) {
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      style={{ backgroundColor: color }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md text-white",
        className,
      )}
    >
      {icon ? (
        <HabitIcon name={icon} className={iconClassName} />
      ) : (
        <span className="text-sm font-semibold leading-none">{letter}</span>
      )}
    </span>
  );
}
