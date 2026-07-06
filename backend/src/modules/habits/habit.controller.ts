import type { Request, Response } from "express";
import { prisma } from "../../prisma.js";
import { Errors } from "../../lib/errors.js";
import { toHabitDto, toTrashedHabitDto } from "../../lib/mappers.js";
import { purgeExpiredHabits } from "../../lib/habitTrash.js";
import type { CreateHabitInput, UpdateHabitInput } from "./habit.schema.js";

/** GET /habits — лише активні навички користувача (не в кошику), сорт за createdAt. */
export const listHabits = async (req: Request, res: Response): Promise<void> => {
  const habits = await prisma.habit.findMany({
    where: { userId: req.userId!, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  res.json(habits.map(toHabitDto));
};

/** GET /habits/trash — навички в кошику. Лениво дочищаємо прострочені, потім віддаємо решту. */
export const listTrash = async (req: Request, res: Response): Promise<void> => {
  await purgeExpiredHabits(req.userId!);
  const habits = await prisma.habit.findMany({
    where: { userId: req.userId!, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
  });
  res.json(habits.map(toTrashedHabitDto));
};

export const createHabit = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as CreateHabitInput;
  const habit = await prisma.habit.create({
    data: {
      userId: req.userId!,
      name: body.name,
      color: body.color,
      icon: body.icon ?? null,
      weeklyTarget: body.weeklyTarget ?? null,
    },
  });
  res.status(201).json(toHabitDto(habit));
};

export const updateHabit = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
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

/**
 * DELETE /habits/:id — за замовчуванням soft-delete (у кошик: ставимо `deletedAt=now`, записи
 * лишаються). `?permanent=true` — остаточне видалення одразу (каскад прибирає `HabitEntry`).
 */
export const deleteHabit = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const permanent = req.query.permanent === "true";

  if (permanent) {
    const result = await prisma.habit.deleteMany({
      where: { id, userId: req.userId! },
    });
    if (result.count === 0) throw Errors.habitNotFound();
  } else {
    // У кошик лише активну навичку (повторний DELETE вже видаленої → 404, ідемпотентно-безпечно).
    const result = await prisma.habit.updateMany({
      where: { id, userId: req.userId!, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) throw Errors.habitNotFound();
  }
  res.status(204).end();
};

/** POST /habits/:id/restore — повертає навичку з кошика (`deletedAt=null`). */
export const restoreHabit = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const result = await prisma.habit.updateMany({
    where: { id, userId: req.userId!, deletedAt: { not: null } },
    data: { deletedAt: null },
  });
  if (result.count === 0) throw Errors.habitNotFound();

  const habit = await prisma.habit.findUnique({ where: { id } });
  res.json(toHabitDto(habit!));
};
