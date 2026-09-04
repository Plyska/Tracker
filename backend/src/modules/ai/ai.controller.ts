import type { Request, Response } from "express";
import { prisma } from "../../prisma.js";
import { audit } from "../../lib/audit.js";
import { Errors } from "../../lib/errors.js";
import { computeInsights } from "./ai.insights.js";
import { getOrCreateReflection, listReflections } from "./ai.reflection.js";
import { assertQuota, getQuota } from "./ai.quota.js";
import { isAiConfigured } from "./ai.client.js";
import type {
  InsightsQuery,
  QuotaQuery,
  ReflectionBody,
  ReflectionsQuery,
} from "./ai.schema.js";

/**
 * Гейт AI: фіча вимкнена, поки користувач не пройшов екран згоди (ADR 0012).
 * Повертає налаштування, бо `aiDiaryOptIn` потрібен далі для контексту.
 */
async function requireAiEnabled(userId: string) {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { aiEnabled: true, aiDiaryOptIn: true, locale: true },
  });
  if (!prefs?.aiEnabled) throw Errors.aiDisabled();
  return prefs;
}

/**
 * GET /ai/insights?today= — підказки-патерни (без LLM).
 *
 * Свідомо БЕЗ гейту `aiEnabled`: нічого не покидає нашу БД (чиста математика над даними
 * користувача), а картка на Dashboard — це «двері» до помічника: CTA «обговорити» веде через
 * екран згоди. Не аудитимо — викликається на кожному відкритті Dashboard і нічого не коштує.
 */
export const getInsights = async (req: Request, res: Response): Promise<void> => {
  const { today } = req.query as unknown as InsightsQuery;
  res.json(await computeInsights(req.userId!, today));
};

/**
 * POST /ai/reflection — лист за період: з кешу або генерація.
 * Порядок перевірок навмисний: згода → квота → генерація. Квоту списуємо лише після успіху
 * (див. ai.quota), а кешований лист її взагалі не витрачає.
 */
export const postReflection = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { period, today, locale } = req.body as ReflectionBody;
  const prefs = await requireAiEnabled(userId);

  await assertQuota(userId, today);
  const result = await getOrCreateReflection(
    userId,
    period,
    today,
    locale,
    prefs.aiDiaryOptIn === true,
  );
  res.json(result);
};

/** GET /ai/reflections?period= — історія (заголовки минулих листів). */
export const getReflections = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  await requireAiEnabled(userId);
  const { period } = req.query as unknown as ReflectionsQuery;
  res.json(await listReflections(userId, period));
};

/** GET /ai/quota?today= — скільки лишилось на сьогодні (+ чи налаштований провайдер). */
export const getAiQuota = async (req: Request, res: Response): Promise<void> => {
  const { today } = req.query as unknown as QuotaQuery;
  const quota = await getQuota(req.userId!, today);
  res.json({ ...quota, configured: isAiConfigured() });
};

/**
 * GET /ai/data — експорт усього AI-шару користувача (GDPR-готовність, ADR 0012).
 * `AiReflection.content` чутливий (може переказувати щоденник) — тому це окремий явний запит,
 * а не частина загального експорту.
 */
export const exportAiData = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const [reflections, usage] = await Promise.all([
    prisma.aiReflection.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        period: true,
        periodKey: true,
        locale: true,
        content: true,
        model: true,
        createdAt: true,
      },
    }),
    prisma.aiUsage.findMany({ where: { userId }, orderBy: { day: "desc" } }),
  ]);
  audit("ai.data.export", { userId });
  res.json({ reflections, usage });
};

/** DELETE /ai/data — видалити всі AI-дані користувача (листи + лічильники квот). */
export const deleteAiData = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const [reflections, usage] = await prisma.$transaction([
    prisma.aiReflection.deleteMany({ where: { userId } }),
    prisma.aiUsage.deleteMany({ where: { userId } }),
  ]);
  audit("ai.data.delete", { userId });
  res.json({ deletedReflections: reflections.count, deletedUsageDays: usage.count });
};
