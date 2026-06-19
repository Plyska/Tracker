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

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserDto;
  token: string;
}

export type OAuthProvider = "google";
