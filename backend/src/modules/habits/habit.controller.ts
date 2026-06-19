import type { Request, Response } from "express";
import { prisma } from "../../prisma.js";
import { Errors } from "../../lib/errors.js";
import { toHabitDto } from "../../lib/mappers.js";
import type { CreateHabitInput, UpdateHabitInput } from "./habit.schema.js";

/** GET /habits — лише не-архівні навички користувача (дзеркалить мок listHabits), сорт за createdAt. */
export const listHabits = async (req: Request, res: Response): Promise<void> => {
  const habits = await prisma.habit.findMany({
    where: { userId: req.userId!, archived: false },
    orderBy: { createdAt: "asc" },
  });
  res.json(habits.map(toHabitDto));
};

export const createHabit = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as CreateHabitInput;
  const habit = await prisma.habit.create({
    data: {
      userId: req.userId!,
      name: body.name,
      color: body.color,
      icon: body.icon ?? null,
    },
  });
  res.status(201).json(toHabitDto(habit));
};

export const updateHabit = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const patch = req.body as UpdateHabitInput;

  // Ownership-gate: оновлюємо лише якщо навичка належить користувачу.
  const result = await prisma.habit.updateMany({
    where: { id, userId: req.userId! },
    data: patch,
  });
  if (result.count === 0) throw Errors.habitNotFound();

  const habit = await prisma.habit.findUnique({ where: { id } });
  res.json(toHabitDto(habit!));
};

export const deleteHabit = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  // Каскад entries — через onDelete: Cascade у схемі.
  const result = await prisma.habit.deleteMany({
    where: { id, userId: req.userId! },
  });
  if (result.count === 0) throw Errors.habitNotFound();
  res.status(204).end();
};
