import { type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export interface FieldProps {
  /** id контрола — звʼязує label↔input; помилка дістає id `${htmlFor}-error` для aria-describedby. */
  htmlFor: string;
  label: string;
  /** Уже локалізований текст помилки (через `t(...)`); відсутній → помилки нема. */
  error?: string;
  children: ReactNode;
  className?: string;
}

/** Обгортка поля форми: label + контрол + повідомлення про помилку (на дизайн-токенах). */
export function Field({ htmlFor, label, error, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
