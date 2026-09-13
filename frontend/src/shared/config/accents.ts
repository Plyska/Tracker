/**
 * Акценти: ключі та пари `--primary` (світла/темна тема) з `shared/styles/tokens.css`.
 * Єдине місце, де hex живе поза CSS: свотчі в Settings і плашка фавікона не можуть читати
 * CSS-змінні сторінки (фавікон — окремий документ). Міняєш tokens.css — міняй і тут.
 */
export type AccentKey = "violet" | "emerald" | "blue" | "orange";

export const DEFAULT_ACCENT: AccentKey = "violet";

export const ACCENT_COLORS: Record<AccentKey, { light: string; dark: string }> = {
  violet: { light: "#6d28d9", dark: "#8b5cf6" },
  emerald: { light: "#059669", dark: "#10b981" },
  blue: { light: "#2563eb", dark: "#3b82f6" },
  orange: { light: "#ea580c", dark: "#f97316" },
};

export const ACCENT_KEYS = Object.keys(ACCENT_COLORS) as AccentKey[];

export const isAccentKey = (value: unknown): value is AccentKey =>
  typeof value === "string" && value in ACCENT_COLORS;
