import type { Request, Response } from "express";
import { computeInsights } from "./ai.insights.js";
import type { InsightsQuery } from "./ai.schema.js";

/**
 * GET /ai/insights?today= — підказки-патерни (без LLM).
 *
 * Свідомо БЕЗ гейту `aiEnabled`: нічого не покидає нашу БД (чиста математика над даними
 * користувача), а картка на Dashboard — це «двері» до помічника: CTA «обговорити» веде через
 * екран згоди. Якщо продуктово вирішимо ховати підказки до згоди — це один рядок тут.
 * Не аудитимо: викликається при кожному відкритті Dashboard і нічого не коштує — лише шум у логах.
 */
export const getInsights = async (req: Request, res: Response): Promise<void> => {
  const { today } = req.query as unknown as InsightsQuery;
  res.json(await computeInsights(req.userId!, today));
};
