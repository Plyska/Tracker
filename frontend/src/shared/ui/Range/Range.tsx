import { Slider } from "radix-ui";
import { cn } from "@/shared/lib";

interface RangeProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  "aria-label"?: string;
}

/** Повзунок (Radix Slider) на дизайн-токенах: трек, заповнення, кругла ручка. */
export function Range({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  "aria-label": ariaLabel,
}: RangeProps) {
  return (
    <Slider.Root
      className={cn(
        "relative flex h-5 w-full touch-none select-none items-center",
        className,
      )}
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => onValueChange(v[0])}
      aria-label={ariaLabel}
    >
      <Slider.Track className="relative h-1.5 w-full grow rounded-full bg-muted">
        <Slider.Range className="absolute h-full rounded-full bg-primary" />
      </Slider.Track>
      <Slider.Thumb
        className={cn(
          "block h-4 w-4 rounded-full border border-primary bg-background shadow-card outline-none",
          "transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        )}
      />
    </Slider.Root>
  );
}
