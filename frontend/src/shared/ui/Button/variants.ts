/**
 * Спільні класи для Button та IconButton (через design-токени, без hardcode).
 * Винесено в окремий файл, щоб компонентні файли експортували лише компоненти
 * (вимога react-refresh/only-export-components).
 */
export const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium " +
  "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring " +
  "disabled:pointer-events-none disabled:opacity-50";

export const buttonVariants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-border hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
} as const;

export const buttonSizes = {
  sm: "h-8 px-3",
  md: "h-9 px-4",
  lg: "h-10 px-5",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;
