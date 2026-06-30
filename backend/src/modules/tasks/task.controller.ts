import type { Request, Response } from "express";
import { prisma } from "../../prisma.js";
import { Errors } from "../../lib/errors.js";
import { toTaskDto } from "../../lib/mappers.js";
import type {
  ClearTasksInput,
  CreateTaskInput,
  UpdateTaskInput,
} from "./task.schema.js";

/** Звіряємо, що навичка-мітка належить користувачу (інакше — чужий/неіснуючий id). */
const assertHabitOwned = async (
  habitId: string,
  userId: string,
): Promise<void> => {
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    select: { id: true },
  });
  if (!habit) throw Errors.habitNotFound();
};

/**
 * GET /tasks — усі задачі користувача (фронт ділить на «Загальну» (date=null), активні дні та архів).
 * Порядок: без дати першими (date asc, nulls first), у межах дня — з часом раніше, далі за createdAt.
 */
export const listTasks = async (req: Request, res: Response): Promise<void> => {
  const tasks = await prisma.task.findMany({
    where: { userId: req.userId! },
    orderBy: [
      { date: { sort: "asc", nulls: "first" } },
      { startTime: { sort: "asc", nulls: "last" } },
      { createdAt: "asc" },
    ],
  });
  res.json(tasks.map(toTaskDto));
};

export const createTask = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as CreateTaskInput;
  if (body.habitId) await assertHabitOwned(body.habitId, req.userId!);

  const task = await prisma.task.create({
    data: {
      userId: req.userId!,
      date: body.date ?? null,
      title: body.title,
      startTime: body.startTime ?? null,
      endTime: body.endTime ?? null,
      habitId: body.habitId ?? null,
    },
  });
  res.status(201).json(toTaskDto(task));
};

export const updateTask = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const patch = req.body as UpdateTaskInput;
  if (patch.habitId) await assertHabitOwned(patch.habitId, req.userId!);

  // Ownership-gate: оновлюємо лише якщо задача належить користувачу.
  const result = await prisma.task.updateMany({
    where: { id, userId: req.userId! },
    data: patch,
  });
  if (result.count === 0) throw Errors.taskNotFound();

  const task = await prisma.task.findUnique({ where: { id } });
  res.json(toTaskDto(task!));
};

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await prisma.task.deleteMany({
    where: { id, userId: req.userId! },
  });
  if (result.count === 0) throw Errors.taskNotFound();
  res.status(204).end();
};

/**
 * DELETE /tasks?date= | ?general=true — видалити цілу картку: усі задачі дня або всі без дати.
 * Ідемпотентно: відсутність задач у картці теж 204 (нема чого видаляти).
 */
export const clearTasks = async (req: Request, res: Response): Promise<void> => {
  const { date, general } = req.query as unknown as ClearTasksInput;
  await prisma.task.deleteMany({
    where: { userId: req.userId!, date: general ? null : date },
  });
  res.status(204).end();
};
