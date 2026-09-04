export interface Habit {
  id: string;
  name: string;
  color: string;
  icon?: string;
  weeklyTarget: number | null; // null = щоденна; 1..6 = «N разів на тиждень» (ADR 0010)
  weeklyMinutesTarget: number | null; // null = не часова; >0 = ціль хвилин/тиждень (ADR 0011)
  createdAt: string; // ISO 'YYYY-MM-DD'
}

/** Навичка в кошику: домен + мітки часу видалення / остаточного прибирання (ISO datetime). */
export interface TrashedHabit extends Habit {
  deletedAt: string;
  purgeAt: string;
}

export interface HabitsState {
  items: Habit[];
}
