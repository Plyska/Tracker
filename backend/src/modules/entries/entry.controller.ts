import type { Request, Response } from "express";
import { prisma } from "../../prisma.js";
import { Errors } from "../../lib/errors.js";
import { toHabitEntryDto } from "../../lib/mappers.js";
import type { EntriesRangeInput, ToggleEntryInput } from "./entry.schema.js";

/** GET /entries?from&to — наявні відмітки користувача в діапазоні (рядкове порівняння ISO-дат). */
export const listEntries = async (req: Request, res: Response): Promise<void> => {
  const { from, to } = req.query as unknown as EntriesRangeInput;
  const entries = await prisma.habitEntry.findMany({
    where: {
      habit: { userId: req.userId! },
      date: { gte: from, lte: to },
    },
  });
  res.json(entries.map(toHabitEntryDto));
};

/**
 * PUT /entries — upsert клітинки (sparse). Сервер — авторитет за типом навички:
 *  - часова (weeklyMinutesTarget != null): пишемо `minutes`, `done` = minutes>0; minutes≤0 → видалити рядок;
 *  - бінарна: `minutes` ігнорується (null); done:true → upsert, done:false → видалити рядок.
 * Завжди повертає echo фактичного стану. Чужа/неіснуюча навичка → 404. Деталі — ADR 0011.
 */
export const toggleEntry = async (req: Request, res: Response): Promise<void> => {
  const { habitId, date, done, minutes } = req.body as ToggleEntryInput;

  // Ownership-gate: відмічати можна лише власні навички.
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId: req.userId! },
    select: { id: true, weeklyMinutesTarget: true },
  });
  if (!habit) throw Errors.habitNotFound();

  const isTimed = habit.weeklyMinutesTarget != null;
  // Для часової навички done — похідне від хвилин; бінарна ігнорує minutes.
  const effMinutes = isTimed ? (minutes ?? 0) : null;
  const effDone = isTimed ? (effMinutes ?? 0) > 0 : done;

  if (effDone) {
    // Бекфіл дозволено: можна відмічати й дні до створення звички (користувач фіксує те, що вже
    // робив). Статистика все одно стартує з першого треку, а межу «які дні редаговні» тримає
    // фронт (лише поточний Пн–Нд-тиждень). Майбутні дні гейтить UI.
    await prisma.habitEntry.upsert({
      where: { habitId_date: { habitId, date } },
      create: { habitId, date, done: true, minutes: effMinutes },
      update: { done: true, minutes: effMinutes },
    });
  } else {
    await prisma.habitEntry.deleteMany({ where: { habitId, date } });
  }

  res.json(
    toHabitEntryDto({ id: "", habitId, date, done: effDone, minutes: effMinutes }),
  );
};
