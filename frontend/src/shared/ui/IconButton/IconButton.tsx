import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import { buttonBase, buttonVariants, type ButtonVariant } from "../Button/variants";

const iconSizes = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
} as const;

export type IconButtonSize = keyof typeof iconSizes;

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Квадратні кнопки використовують лише нейтральні варіанти. */
  variant?: Extract<ButtonVariant, "outline" | "ghost">;
  size?: IconButtonSize;
}

/** Квадратна кнопка-іконка. Завжди потребує `aria-label`. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = "ghost", size = "md", type = "button", className, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonBase, buttonVariants[variant], iconSizes[size], className)}
      {...props}
    />
  ),
);

IconButton.displayName = "IconButton";
