import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib";

type DeltaFormat = "pp" | "int" | "mood";

interface DeltaBadgeProps {
  delta: number;
  /** 'pp' — частка → в.п. (×100); 'int' — ціле (напр. ідеальні дні); 'mood' — бали з 1 знаком. */
  format: DeltaFormat;
  className?: string;
}

/**
 * Бейдж зміни vs попередній період: ▲/▼ + значення, зелене (зросло) / червоне (просіло) /
 * приглушене «—» (без змін). Патерн кольорів — як у MoodCorrelationCard. «Вгору = краще»
 * для всіх метрик, що ми порівнюємо (виконання, ідеальні дні, настрій).
 */
export function DeltaBadge({ delta, format, className }: DeltaBadgeProps) {
  const { t } = useTranslation();

  // Округлене значення + чи це «нуль» (нижче помітного порога) — у форматі метрики.
  const rounded =
    format === "pp"
      ? Math.round(delta * 100)
      : format === "mood"
        ? Math.round(delta * 10) / 10
        : Math.round(delta);
  const isFlat = rounded === 0;
  const up = rounded > 0;

  const magnitude =
    format === "pp"
      ? `${Math.abs(rounded)} ${t("statistics.unit.pp")}`
      : format === "mood"
        ? Math.abs(rounded).toFixed(1)
        : String(Math.abs(rounded));

  const Icon = isFlat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const sign = isFlat ? "" : up ? "+" : "−";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums",
        isFlat
          ? "text-muted-foreground"
          : up
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {sign}
      {magnitude}
    </span>
  );
}
