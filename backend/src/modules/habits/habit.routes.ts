import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireCsrf } from "../../lib/csrf.js";
import { validate } from "../../middleware/validate.js";
import {
  createHabitSchema,
  habitParamsSchema,
  updateHabitSchema,
} from "./habit.schema.js";
import * as ctrl from "./habit.controller.js";

export const habitsRouter = Router();

// Усі маршрути навичок — лише для автентифікованих; мутації захищені CSRF (GET — пропускається).
habitsRouter.use(requireAuth, requireCsrf);

habitsRouter.get("/", asyncHandler(ctrl.listHabits));
habitsRouter.post("/", validate(createHabitSchema), asyncHandler(ctrl.createHabit));
habitsRouter.patch(
  "/:id",
  validate(habitParamsSchema, "params"),
  validate(updateHabitSchema),
  asyncHandler(ctrl.updateHabit),
);
habitsRouter.delete(
  "/:id",
  validate(habitParamsSchema, "params"),
  asyncHandler(ctrl.deleteHabit),
);
