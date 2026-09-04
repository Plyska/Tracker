/**
 * Доменна модель статистики. Структурно тотожна `StatsDto` — `null` тут несе сенс
 * («даних немає»: bestHabit / moodAverage), тож лишаємо як є, без мапінгу в `undefined`.
 */
export interface DailyStat {
  date: string; // 'YYYY-MM-DD'
  completed: number;
  total: number;
  mood: number | null;
  minutes: number; // сума хвилин часових навичок за день (ADR 0011)
}

export interface HabitBreakdown {
  habitId: string;
  completionRate: number; // 0..1 за період
  activeDays: number; // днів, коли звичка була активна (для гейту вибірки)
  weeklyTarget: number | null; // null = щоденна; 1..6 = тижнева ціль (для підписів/гейту в тижнях)
  weeklyMinutesTarget: number | null; // null = не часова; >0 = ціль хвилин/тиждень (ADR 0011)
  totalMinutes: number; // сумарно хвилин за період (0 для бінарних)
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

export interface HabitSynergy {
  habitA: string; // якщо виконано A
  habitB: string; // → частка виконання B
  rate: number; // P(B | A виконано), 0..1
  baseline: number; // базова частка B за період, 0..1
  delta: number; // rate − baseline
  sampleDays: number;
}

export interface HabitStreak {
  habitId: string;
  current: number; // поточна серія (днів поспіль)
  longest: number; // найдовша за всю історію
}

export interface Stats {
  completionRate: number; // 0..1
  currentStreak: number;
  longestStreak: number;
  perfectDays: number;
  bestHabit: { habitId: string; completionRate: number } | null;
  habitBreakdown: HabitBreakdown[];
  moodAverage: number | null;
  moodDays: number;
  daily: DailyStat[];
  moodCorrelations: MoodCorrelation[];
  moodVsCompletion: MoodVsCompletion | null;
  habitSynergies: HabitSynergy[];
  habitStreaks: HabitStreak[];
}
