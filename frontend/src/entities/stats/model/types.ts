/**
 * Доменна модель статистики. Структурно тотожна `StatsDto` — `null` тут несе сенс
 * («даних немає»: bestHabit / moodAverage), тож лишаємо як є, без мапінгу в `undefined`.
 */
export interface DailyStat {
  date: string; // 'YYYY-MM-DD'
  completed: number;
  total: number;
  mood: number | null;
}

export interface MoodCorrelation {
  habitId: string;
  moodWith: number; // середній настрій у дні виконання
  moodWithout: number; // … коли не виконано
  delta: number; // moodWith − moodWithout
  sampleWith: number;
  sampleWithout: number;
}

export interface MoodVsCompletion {
  delta: number; // highAvg − lowAvg (бали настрою)
  lowAvg: number;
  highAvg: number;
  sampleDays: number;
}

export interface Stats {
  completionRate: number; // 0..1
  currentStreak: number;
  longestStreak: number;
  perfectDays: number;
  bestHabit: { habitId: string; completionRate: number } | null;
  moodAverage: number | null;
  moodDays: number;
  daily: DailyStat[];
  moodCorrelations: MoodCorrelation[];
  moodVsCompletion: MoodVsCompletion | null;
}
