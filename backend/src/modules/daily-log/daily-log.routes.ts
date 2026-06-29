import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireCsrf } from "../../lib/csrf.js";
import { validate } from "../../middleware/validate.js";
import {
  dailyLogRangeSchema,
  upsertDailyLogSchema,
} from "./daily-log.schema.js";
import * as ctrl from "./daily-log.controller.js";

export const dailyLogsRouter = Router();

dailyLogsRouter.use(requireAuth, requireCsrf);

dailyLogsRouter.get(
  "/",
  validate(dailyLogRangeSchema, "query"),
  asyncHandler(ctrl.listDailyLogs),
);
dailyLogsRouter.put(
  "/",
  validate(upsertDailyLogSchema),
  asyncHandler(ctrl.upsertDailyLog),
);
