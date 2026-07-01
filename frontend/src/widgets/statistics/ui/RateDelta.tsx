import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/shared/lib";

interface RateDeltaProps {
  from: number; // частка 0..1 (попередній період)
  to: number; // частка 0..1 (поточний період)
  className?: string;
}

/**
 * Зміна частки виконання у вигляді «було → стало» (напр. «70% → 76%») зі стрілкою й кольором
 * (зросло — зелене, просіло — червоне, без змін — приглушене). Наочніша альтернатива дельті у
 * відсоткових пунктах. Порівнюємо ЗАокруглені відсотки, щоб «70% → 70%» не блимало стрілкою.
 */
export function RateDelta({ from, to, className }: RateDeltaProps) {
  const fromPct = Math.round(from * 100);
  const toPct = Math.round(to * 100);
  const flat = fromPct === toPct;
  const up = toPct > fromPct;

  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold tabular-nums",
        flat
          ? "text-muted-foreground"
          : up
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {fromPct}% → {toPct}%
    </span>
  );
}
