import type { Request, Response } from "express";
import { prisma } from "../../prisma.js";
import { toPreferencesDto } from "../../lib/mappers.js";
import type { UpdatePreferencesInput } from "./preferences.schema.js";

/** GET /me/preferences — налаштування власника сесії (немає рядка → усі поля null). */
export const getPreferences = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: req.userId! },
  });
  res.json(toPreferencesDto(prefs));
};

/** PATCH /me/preferences — upsert; оновлює лише передані поля (решта лишається як є). */
export const updatePreferences = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const patch = req.body as UpdatePreferencesInput;
  const prefs = await prisma.userPreferences.upsert({
    where: { userId: req.userId! },
    create: { userId: req.userId!, ...patch },
    update: patch,
  });
  res.json(toPreferencesDto(prefs));
};
