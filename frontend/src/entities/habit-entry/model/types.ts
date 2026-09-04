export interface HabitEntry {
  habitId: string;
  date: string; // ISO 'YYYY-MM-DD'
  done: boolean;
  minutes: number | null; // null для бінарних; хвилини за день для часових (ADR 0011)
}
