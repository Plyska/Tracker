import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import {
  buttonBase,
  buttonSizes,
  buttonVariants,
  type ButtonSize,
  type ButtonVariant,
} from "./variants";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Текстова кнопка з варіантами/розмірами на дизайн-токенах. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", type = "button", className, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      {...props}
    />
  ),
);

Button.displayName = "Button";
