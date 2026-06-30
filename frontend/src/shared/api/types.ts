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
  createdAt: string; // ISO 'YYYY-MM-DD'
  archived: boolean;
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
}

export type UpdateHabitRequest = Partial<{
  name: string;
  color: string;
  icon: string | null;
  archived: boolean;
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
 * Cookie-флоу (Security-фаза, варіант B): токени не в тілі. login/register повертають лише
 * `{ user }`; access/refresh/csrf виставляє бекенд у cookie. refresh → 204 (теж лише cookie).
 */
export interface AuthResponse {
  user: UserDto;
}

export type OAuthProvider = "google";
