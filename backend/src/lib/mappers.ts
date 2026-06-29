import type { DailyLog, Habit, HabitEntry, Task, User } from "@prisma/client";

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
  archived: boolean;
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

const toISODate = (d: Date): string => d.toISOString().slice(0, 10);

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
  archived: h.archived,
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
