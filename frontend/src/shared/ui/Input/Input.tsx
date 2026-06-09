import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

/** Текстове поле вводу на дизайн-токенах. Стан помилки — через `aria-invalid`. */
export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "h-10 w-full rounded-md border border-input bg-transparent px-3.5 text-base outline-none",
      "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive",
      className,
    )}
    {...props}
  />
));

Input.displayName = "Input";
