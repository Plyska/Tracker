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

/**
 * PATCH /me/preferences — upsert; оновлює лише передані поля (решта лишається як є).
 * AI (ADR 0012): при ПЕРШОМУ `aiEnabled: true` сервер фіксує `aiConsentAt` (момент згоди, GDPR-доказ);
 * повторні вмикання/вимикання мітку не змінюють — вона про перше інформоване рішення.
 */
export const updatePreferences = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const patch = req.body as UpdatePreferencesInput;
  const userId = req.userId!;

  let consentPatch: { aiConsentAt: Date } | Record<string, never> = {};
  if (patch.aiEnabled === true) {
    const existing = await prisma.userPreferences.findUnique({
      where: { userId },
      select: { aiConsentAt: true },
    });
    if (!existing?.aiConsentAt) consentPatch = { aiConsentAt: new Date() };
  }

  const prefs = await prisma.userPreferences.upsert({
    where: { userId },
    create: { userId, ...patch, ...consentPatch },
    update: { ...patch, ...consentPatch },
  });
  res.json(toPreferencesDto(prefs));
};
