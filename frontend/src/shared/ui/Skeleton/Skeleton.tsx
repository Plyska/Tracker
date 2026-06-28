import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib";

/**
 * Реюзабельний скелетон-плейсхолдер (конвенція skeleton-first). Акцентно-тонована поверхня
 * (`bg-accent`) із рухомим shimmer-блиском на `--primary`; під `prefers-reduced-motion` shimmer
 * вимикається й лишається спокійний `pulse`. Форму/розмір задає `className` (h-*, w-*, rounded-*).
 *
 * `aria-hidden` — це візуальний плейсхолдер, не контент для скрінрідера (стан завантаження
 * оголошує контейнер через `aria-busy`/`aria-live`).
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-accent/60",
        "motion-reduce:animate-pulse",
        // shimmer-overlay
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_1.6s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-primary/20 before:to-transparent",
        "motion-reduce:before:hidden",
        className,
      )}
      {...props}
    />
  );
}
