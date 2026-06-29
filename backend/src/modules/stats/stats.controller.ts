import type { Request, Response } from "express";
import { computeStats } from "./stats.service.js";
import type { StatsQueryInput } from "./stats.schema.js";

/** GET /stats?from&to&habitId — агрегації за період (scope по userId). */
export const getStats = async (req: Request, res: Response): Promise<void> => {
  const { from, to, habitId } = req.query as unknown as StatsQueryInput;
  const stats = await computeStats(req.userId!, from, to, habitId);
  res.json(stats);
};
