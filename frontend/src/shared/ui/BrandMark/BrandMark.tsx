import { cn } from "@/shared/lib/cn";
import { GRID, PAST_OPACITY, cells } from "./geometry";

/**
 * Знак Tellday — «колонка дня»: сітка «навички × дні» 3×3, у якій сьогоднішня (права) колонка
 * залита, а минулі дні — приглушені тим самим кольором. Малюється лише `currentColor`, тому бере
 * колір контейнера і не ламається від жодного акценту користувача. Геометрія — у `geometry.ts`.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden className={className}>
      {cells(GRID).map(({ x, y, today }) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={GRID.size}
          height={GRID.size}
          rx={GRID.radius}
          opacity={today ? undefined : PAST_OPACITY}
        />
      ))}
    </svg>
  );
}

/** Знак у плашці акценту — як у навбарі лендінгу і в шапці сайдбара. 28px; радіус — як у чекбокса. */
export function BrandBadge({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground",
        className,
      )}
    >
      <BrandMark className="h-5 w-5" />
    </span>
  );
}
