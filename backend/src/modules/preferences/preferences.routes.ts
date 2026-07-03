import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireCsrf } from "../../lib/csrf.js";
import { validate } from "../../middleware/validate.js";
import { updatePreferencesSchema } from "./preferences.schema.js";
import * as ctrl from "./preferences.controller.js";

export const preferencesRouter = Router();

preferencesRouter.use(requireAuth, requireCsrf);

preferencesRouter.get("/", asyncHandler(ctrl.getPreferences));
preferencesRouter.patch(
  "/",
  validate(updatePreferencesSchema),
  asyncHandler(ctrl.updatePreferences),
);
