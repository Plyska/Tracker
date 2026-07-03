export interface Habit {
  id: string;
  name: string;
  color: string;
  icon?: string;
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
