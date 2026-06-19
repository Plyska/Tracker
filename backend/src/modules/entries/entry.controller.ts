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
 * PUT /entries — upsert клітинки (sparse). done:true → створити/оновити; done:false → видалити рядок.
 * Завжди повертає echo запиту. Чужа/неіснуюча навичка → 404.
 */
export const toggleEntry = async (req: Request, res: Response): Promise<void> => {
  const { habitId, date, done } = req.body as ToggleEntryInput;

  // Ownership-gate: відмічати можна лише власні навички.
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId: req.userId! },
    select: { id: true },
  });
  if (!habit) throw Errors.habitNotFound();

  if (done) {
    await prisma.habitEntry.upsert({
      where: { habitId_date: { habitId, date } },
      create: { habitId, date, done: true },
      update: { done: true },
    });
  } else {
    await prisma.habitEntry.deleteMany({ where: { habitId, date } });
  }

  res.json(toHabitEntryDto({ id: "", habitId, date, done }));
};
