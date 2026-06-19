import { nanoid } from "@reduxjs/toolkit";
import { entryKey, getWeekDays, isFutureDay, toISODate } from "@/shared/lib";
import type {
  ApiError,
  AuthResponse,
  CreateHabitRequest,
  HabitDto,
  HabitEntryDto,
  LoginRequest,
  OAuthProvider,
  RegisterRequest,
  UpdateHabitRequest,
  UserDto,
} from "../types";

/**
 * In-memory мок-«сервер» (frontend-first, ADR 0003). **Session-only, без localStorage** —
 * рефреш скидає до сіду (свідомо, ADR 0004). Замінюється реальним Express+Prisma на
 * backend-фазі; для фронту змінюється лише `baseQuery` (мок → HTTP), не ці дані.
 *
 * Перенесено зі знятих слайсів habitsSlice/entriesSlice. Помилки кидаємо як `ApiError`
 * (мок майже завжди успішний, але шов помилок реальний — див. mockBaseQuery).
 */

const SEED_HABITS: HabitDto[] = [
  { id: "h1", name: "Reading", color: "#6d28d9", icon: "BookOpen", createdAt: "2026-01-01", archived: false },
  { id: "h2", name: "Running", color: "#059669", icon: "Footprints", createdAt: "2026-01-01", archived: false },
  { id: "h3", name: "Learning English", color: "#2563eb", icon: "Languages", createdAt: "2026-01-01", archived: false },
  { id: "h4", name: "Wake up at 8 AM", color: "#ea580c", icon: "AlarmClock", createdAt: "2026-01-01", archived: false },
  { id: "h5", name: "Morning workout", color: "#db2777", icon: "Dumbbell", createdAt: "2026-01-01", archived: false },
];

/** Сід відміток: частина навичок на днях поточного тижня до сьогодні включно. */
function buildSeedEntries(): Record<string, HabitEntryDto> {
  const pattern: Record<string, number[]> = {
    h1: [0, 1, 2, 3],
    h2: [0, 2, 4],
    h3: [0, 1, 2, 3, 4],
    h4: [1, 3],
    h5: [0, 2],
  };
  const week = getWeekDays(new Date());
  const byKey: Record<string, HabitEntryDto> = {};
  for (const [habitId, days] of Object.entries(pattern)) {
    for (const dayIndex of days) {
      const day = week[dayIndex];
      if (isFutureDay(day)) continue;
      const date = toISODate(day);
      byKey[entryKey(habitId, date)] = { habitId, date, done: true };
    }
  }
  return byKey;
}

// Мутабельний стан «сервера» (один інстанс на сесію вкладки).
let habits: HabitDto[] = SEED_HABITS.map((h) => ({ ...h }));
const entries: Record<string, HabitEntryDto> = buildSeedEntries();
// Видані токени → користувач (для GET /auth/me). Порожніє при рефреші (session-only).
const sessions = new Map<string, UserDto>();

const error = (code: string, message: string): ApiError => ({ code, message });

// --- Habits ---

export function listHabits(): HabitDto[] {
  return habits.filter((h) => !h.archived);
}

export function createHabit(req: CreateHabitRequest): HabitDto {
  const habit: HabitDto = {
    id: nanoid(),
    name: req.name.trim(),
    color: req.color,
    icon: req.icon ?? null,
    createdAt: new Date().toISOString().slice(0, 10),
    archived: false,
  };
  habits.push(habit);
  return habit;
}

export function patchHabit(id: string, req: UpdateHabitRequest): HabitDto {
  const habit = habits.find((h) => h.id === id);
  if (!habit) throw error("HABIT_NOT_FOUND", "Habit not found");
  if (req.name !== undefined) habit.name = req.name.trim();
  if (req.color !== undefined) habit.color = req.color;
  if (req.icon !== undefined) habit.icon = req.icon;
  if (req.archived !== undefined) habit.archived = req.archived;
  return habit;
}

/** Видалення з каскадом по entries (§5.2 контракту). */
export function deleteHabit(id: string): void {
  if (!habits.some((h) => h.id === id))
    throw error("HABIT_NOT_FOUND", "Habit not found");
  habits = habits.filter((h) => h.id !== id);
  for (const key of Object.keys(entries)) {
    if (entries[key].habitId === id) delete entries[key];
  }
}

// --- Entries ---

/** Плоский список наявних відміток у діапазоні [from, to] (включно). */
export function listEntries(from: string, to: string): HabitEntryDto[] {
  return Object.values(entries).filter((e) => e.date >= from && e.date <= to);
}

/** Upsert клітинки (PUT /entries): done:false → прибираємо запис (sparse). */
export function putEntry(req: ToggleArg): HabitEntryDto {
  const key = entryKey(req.habitId, req.date);
  const next: HabitEntryDto = { habitId: req.habitId, date: req.date, done: req.done };
  if (req.done) entries[key] = next;
  else delete entries[key];
  return next;
}
type ToggleArg = { habitId: string; date: string; done: boolean };

// --- Auth ---

function makeUser(email: string, name?: string | null): UserDto {
  return {
    id: nanoid(),
    email: email.trim(),
    name: name?.trim() || null,
    avatarUrl: null,
    plan: "pro", // політика релізу: усі фічі відкриті (monetization.md)
    role: "user",
  };
}

function issue(user: UserDto): AuthResponse {
  const token = `mock-token-${nanoid()}`;
  sessions.set(token, user);
  return { user, token };
}

export function login(req: LoginRequest): AuthResponse {
  return issue(makeUser(req.email));
}

export function register(req: RegisterRequest): AuthResponse {
  return issue(makeUser(req.email, req.name));
}

export function oauth(provider: OAuthProvider): AuthResponse {
  return issue(makeUser(`user@${provider}.com`));
}

/** GET /auth/me — за токеном сесії. Невідомий токен → 401. */
export function me(token: string | null): UserDto {
  const user = token ? sessions.get(token) : undefined;
  if (!user) throw error("UNAUTHENTICATED", "Not authenticated");
  return user;
}
