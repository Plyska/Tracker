import type { Request, Response } from "express";
import { prisma } from "../../prisma.js";
import { toDailyLogDto } from "../../lib/mappers.js";
import { stripHtml } from "../../lib/html.js";
import type {
  DailyLogRangeInput,
  UpsertDailyLogInput,
} from "./daily-log.schema.js";

/** GET /daily-logs?from&to — денні логи настрою користувача в діапазоні (рядкове ISO-порівняння). */
export const listDailyLogs = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { from, to } = req.query as unknown as DailyLogRangeInput;
  const logs = await prisma.dailyLog.findMany({
    where: { userId: req.userId!, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });
  res.json(logs.map(toDailyLogDto));
};

/**
 * GET /daily-logs/feed — стрічка щоденника: усі записи з непорожньою нотаткою, новіші зверху.
 * Дні лише з настроєм (без тексту) у стрічку не потрапляють.
 */
export const listDiaryFeed = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const logs = await prisma.dailyLog.findMany({
    where: { userId: req.userId!, notes: { not: null } },
    orderBy: { date: "desc" },
  });
  // Відсіюємо порожні/пробільні нотатки (порожній HTML міг лишитись після очищення тексту).
  const withNotes = logs.filter((l) => l.notes && stripHtml(l.notes).length > 0);
  res.json(withNotes.map(toDailyLogDto));
};

/**
 * PUT /daily-logs — upsert денного логу (sparse, один на день). mood 1–5; notes опційні.
 * Унікальний ключ — (userId, date).
 */
export const upsertDailyLog = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { date, mood, notes } = req.body as UpsertDailyLogInput;

  const log = await prisma.dailyLog.upsert({
    where: { userId_date: { userId: req.userId!, date } },
    create: { userId: req.userId!, date, mood, notes: notes ?? null },
    update: { mood, notes: notes ?? null },
  });

  res.json(toDailyLogDto(log));
};
