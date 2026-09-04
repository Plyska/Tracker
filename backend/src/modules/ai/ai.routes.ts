import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireCsrf } from "../../lib/csrf.js";
import { validate } from "../../middleware/validate.js";
import { aiLimiter } from "../../middleware/rateLimit.js";
import { insightsQuerySchema } from "./ai.schema.js";
import * as ctrl from "./ai.controller.js";

export const aiRouter = Router();

// Порядок важливий: requireAuth ставить req.userId, за яким aiLimiter рахує ліміт per-user
// (не per-IP). CSRF — як на решті приватних роутів (double-submit cookie).
aiRouter.use(requireAuth, requireCsrf, aiLimiter);

// Підказки-патерни — без LLM (див. ai.insights.ts). `today` — локальна дата клієнта.
aiRouter.get(
  "/insights",
  validate(insightsQuerySchema, "query"),
  asyncHandler(ctrl.getInsights),
);
