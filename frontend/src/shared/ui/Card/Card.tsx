import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

/** Піднята поверхня (картка/попап) на дизайн-токенах. */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-card p-6 text-card-foreground shadow-card",
        className,
      )}
      {...props}
    />
  ),
);

Card.displayName = "Card";
