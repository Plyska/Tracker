import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { entriesRangeSchema, toggleEntrySchema } from "./entry.schema.js";
import * as ctrl from "./entry.controller.js";

export const entriesRouter = Router();

entriesRouter.use(requireAuth);

entriesRouter.get(
  "/",
  validate(entriesRangeSchema, "query"),
  asyncHandler(ctrl.listEntries),
);
entriesRouter.put("/", validate(toggleEntrySchema), asyncHandler(ctrl.toggleEntry));
