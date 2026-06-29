import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { statsQuerySchema } from "./stats.schema.js";
import * as ctrl from "./stats.controller.js";

export const statsRouter = Router();

// Stats — лише читання (GET), тож CSRF не потрібен; досить requireAuth.
statsRouter.use(requireAuth);

statsRouter.get(
  "/",
  validate(statsQuerySchema, "query"),
  asyncHandler(ctrl.getStats),
);
