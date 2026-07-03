import type {
  DailyLog,
  Habit,
  HabitEntry,
  Task,
  User,
  UserPreferences,
} from "@prisma/client";
import { purgeAtFor } from "./habitTrash.js";

/**
 * Domain (Prisma) → DTO «на дроті» (docs/api-contract.md). Опційні поля — явні `null`.
 * Дати-таймстемпи → ISO `YYYY-MM-DD` (без часу/TZ).
 */

export interface UserDto {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: "free" | "pro";
  role: "user" | "admin";
}

export interface HabitDto {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  createdAt: string;
}

/** Навичка в кошику: базовий DTO + коли видалено і коли буде остаточно прибрано (ISO datetime). */
export interface TrashedHabitDto extends HabitDto {
  deletedAt: string;
  purgeAt: string;
}

export interface HabitEntryDto {
  habitId: string;
  date: string;
  done: boolean;
}

export interface DailyLogDto {
  date: string;
  mood: number; // 1–5
  notes: string | null;
}

export interface TaskDto {
  id: string;
  date: string | null; // null = без дати («Загальна» картка)
  title: string;
  startTime: string | null; // 'HH:mm' (локальний, без TZ)
  endTime: string | null;
  habitId: string | null; // опційна мітка на навичку
  done: boolean;
  createdAt: string;
}

/** Клієнтські налаштування. Усі поля nullable: `null` = не задано → фронт бере дефолт. */
export interface PreferencesDto {
  theme: string | null;
  accent: string | null;
  locale: string | null;
  tableLayout: string | null;
  statsGoalPct: number | null;
}

const toISODate = (d: Date): string => d.toISOString().slice(0, 10);

/** Немає рядка (юзер ще не зберігав) → усі поля null (дефолти застосовує клієнт). */
export const toPreferencesDto = (p: UserPreferences | null): PreferencesDto => ({
  theme: p?.theme ?? null,
  accent: p?.accent ?? null,
  locale: p?.locale ?? null,
  tableLayout: p?.tableLayout ?? null,
  statsGoalPct: p?.statsGoalPct ?? null,
});

export const toUserDto = (u: User): UserDto => ({
  id: u.id,
  email: u.email,
  name: u.name ?? null,
  avatarUrl: u.avatarUrl ?? null,
  // Політика релізу: усі фічі відкриті. На фазі монетизації — похідне від активної підписки.
  plan: "pro",
  role: u.role,
});

export const toHabitDto = (h: Habit): HabitDto => ({
  id: h.id,
  name: h.name,
  color: h.color,
  icon: h.icon ?? null,
  createdAt: toISODate(h.createdAt),
});

/** Навичка в кошику. Викликати лише коли `deletedAt` не null (елементи кошика). */
export const toTrashedHabitDto = (h: Habit): TrashedHabitDto => ({
  ...toHabitDto(h),
  deletedAt: h.deletedAt!.toISOString(),
  purgeAt: purgeAtFor(h.deletedAt!).toISOString(),
});

export const toHabitEntryDto = (e: HabitEntry): HabitEntryDto => ({
  habitId: e.habitId,
  date: e.date,
  done: e.done,
});

export const toDailyLogDto = (l: DailyLog): DailyLogDto => ({
  date: l.date,
  mood: l.mood,
  notes: l.notes ?? null,
});

export const toTaskDto = (t: Task): TaskDto => ({
  id: t.id,
  date: t.date ?? null,
  title: t.title,
  startTime: t.startTime ?? null,
  endTime: t.endTime ?? null,
  habitId: t.habitId ?? null,
  done: t.done,
  createdAt: toISODate(t.createdAt),
});
