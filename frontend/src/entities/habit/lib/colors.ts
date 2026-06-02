/**
 * Палітра кольорів навичок. Free отримує авто-колір (рандом з 4 акцентів);
 * Pro обирає з повного набору пресетів + довільний hex (colorpicker).
 */
export const FREE_HABIT_COLORS = [
  "#6d28d9", // violet
  "#059669", // emerald
  "#2563eb", // blue
  "#ea580c", // orange
] as const;

export const PRESET_HABIT_COLORS = [
  ...FREE_HABIT_COLORS,
  "#db2777", // pink
  "#0891b2", // cyan
  "#ca8a04", // amber
  "#dc2626", // red
  "#4f46e5", // indigo
  "#16a34a", // green
] as const;

/** Випадковий колір для Free-навички (1 з 4 акцентів). */
export function randomHabitColor(): string {
  const i = Math.floor(Math.random() * FREE_HABIT_COLORS.length);
  return FREE_HABIT_COLORS[i];
}
