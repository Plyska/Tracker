export interface Habit {
  id: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: string; // ISO 'YYYY-MM-DD'
  archived?: boolean;
}

export interface HabitsState {
  items: Habit[];
}
