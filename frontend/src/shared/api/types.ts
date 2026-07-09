/**
 * Wire-типи API (DTO) — рівно за [api-contract.md](../../../../docs/api-contract.md).
 * Це контракт між frontend і backend, тому живуть у `shared` (нижній шар): не залежать
 * від доменних типів entities. Опційні поля — явні `null` (а не `undefined`).
 * entities маплять DTO → domain через `transformResponse`.
 */

export type Plan = "free" | "pro";

export interface HabitDto {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  weeklyTarget: number | null; // null = щоденна; 1..6 = «N разів на тиждень» (ADR 0010)
  createdAt: string; // ISO 'YYYY-MM-DD'
}

/** Навичка в кошику (`GET /habits/trash`): базовий DTO + коли видалено / коли буде остаточно прибрано. */
export interface TrashedHabitDto extends HabitDto {
  deletedAt: string; // ISO datetime
  purgeAt: string; // ISO datetime — момент остаточного видалення
}

export interface HabitEntryDto {
  habitId: string;
  date: string; // 'YYYY-MM-DD'
  done: boolean;
}

export interface UserDto {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: Plan;
  role: "user" | "admin";
}

export interface DailyLogDto {
  date: string; // 'YYYY-MM-DD'
  mood: number; // 1–5
  notes: string | null;
}

export interface StatsDto {
  completionRate: number; // 0..1
  currentStreak: number;
  longestStreak: number;
  perfectDays: number;
  bestHabit: { habitId: string; completionRate: number } | null;
  // Частка виконання по кожній звичці за період (активні ≥1 день) — для «movers».
  habitBreakdown: {
    habitId: string;
    completionRate: number;
    activeDays: number;
    weeklyTarget: number | null;
  }[];
  moodAverage: number | null;
  moodDays: number;
  daily: {
    date: string;
    completed: number;
    total: number;
    mood: number | null;
  }[];
  moodCorrelations: {
    habitId: string;
    moodWith: number;
    moodWithout: number;
    delta: number;
    sampleWith: number;
    sampleWithout: number;
  }[];
  moodVsCompletion: {
    delta: number;
    lowAvg: number;
    highAvg: number;
    sampleDays: number;
  } | null;
  habitSynergies: {
    habitA: string;
    habitB: string;
    rate: number; // P(B | A виконано), 0..1
    baseline: number; // базова частка B, 0..1
    delta: number; // rate − baseline
    sampleDays: number;
  }[];
  habitStreaks: { habitId: string; current: number; longest: number }[];
}

/**
 * Задача розпорядку дня / списку справ. `startTime`/`endTime` ('HH:mm', локальний час без TZ —
 * ADR 0009): задані ⇒ елемент розпорядку, обидва `null` ⇒ елемент списку справ. `habitId` —
 * опційна мітка на навичку.
 */
export interface TaskDto {
  id: string;
  date: string | null; // 'YYYY-MM-DD'; null = без дати («Загальна» картка)
  title: string;
  startTime: string | null; // 'HH:mm'
  endTime: string | null; // 'HH:mm'
  habitId: string | null;
  done: boolean;
  createdAt: string; // ISO 'YYYY-MM-DD'
}

/** Тіло будь-якої помилки API. */
export interface ApiError {
  message: string; // людиночитабельне
  code: string; // машинне, напр. 'HABIT_NOT_FOUND'
}

// --- Request bodies ---

export interface CreateHabitRequest {
  name: string;
  color: string;
  icon?: string | null;
  weeklyTarget?: number | null; // null / відсутнє = щоденна; 1..6 = тижнева ціль
}

export type UpdateHabitRequest = Partial<{
  name: string;
  color: string;
  icon: string | null;
  weeklyTarget: number | null;
}>;

export interface ToggleEntryRequest {
  habitId: string;
  date: string;
  done: boolean;
}

export interface UpsertDailyLogRequest {
  date: string;
  mood: number; // 1–5
  notes?: string;
}

export interface CreateTaskRequest {
  date?: string | null; // null/відсутня → «Загальна» картка
  title: string;
  startTime?: string | null;
  endTime?: string | null;
  habitId?: string | null;
}

export type UpdateTaskRequest = Partial<{
  date: string | null;
  title: string;
  startTime: string | null;
  endTime: string | null;
  habitId: string | null;
  done: boolean;
}>;

export interface StatsQuery {
  from: string; // 'YYYY-MM-DD'
  to: string; // 'YYYY-MM-DD'
  habitId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

/**
 * Оновлення профілю (`PATCH /auth/me`): ім'я + (опц.) аватар. Email/пароль — окремі флоу.
 * `avatarUrl`: `undefined` — не чіпати; `null` — прибрати; data-URL (base64) — встановити.
 */
export interface UpdateProfileRequest {
  name: string;
  avatarUrl?: string | null;
}

/**
 * Cookie-флоу (Security-фаза, варіант B): токени не в тілі. login/register повертають лише
 * `{ user }`; access/refresh/csrf виставляє бекенд у cookie. refresh → 204 (теж лише cookie).
 */
export interface AuthResponse {
  user: UserDto;
}

export type OAuthProvider = "google";

/**
 * Клієнтські налаштування, збережені в БД (`/me/preferences`). Усі поля nullable:
 * `null` = не задано → клієнт застосовує дефолт. Значення — рядки/числа (набори валідує фронт).
 */
export interface PreferencesDto {
  theme: string | null;
  accent: string | null;
  locale: string | null;
  tableLayout: string | null;
  statsGoalPct: number | null;
  hiddenStatWidgets: string[] | null; // null = ще не зберігалось (для seed-логіки)
  editorScale: number | null;
}

/** PATCH /me/preferences — часткове оновлення (передаємо лише те, що змінилось). */
export type UpdatePreferencesRequest = Partial<{
  theme: string;
  accent: string;
  locale: string;
  tableLayout: string;
  statsGoalPct: number | null;
  hiddenStatWidgets: string[];
  editorScale: number;
}>;
