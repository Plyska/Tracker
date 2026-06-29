import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireCsrf } from "../../lib/csrf.js";
import { validate } from "../../middleware/validate.js";
import {
  clearTasksQuerySchema,
  createTaskSchema,
  taskParamsSchema,
  updateTaskSchema,
} from "./task.schema.js";
import * as ctrl from "./task.controller.js";

export const tasksRouter = Router();

// Усі маршрути задач — лише для автентифікованих; мутації захищені CSRF (GET — пропускається).
tasksRouter.use(requireAuth, requireCsrf);

tasksRouter.get("/", asyncHandler(ctrl.listTasks));
tasksRouter.post("/", validate(createTaskSchema), asyncHandler(ctrl.createTask));
// Очистити цілу картку (день або «Загальна») — до "/:id", щоб не конфліктувати по шляху.
tasksRouter.delete(
  "/",
  validate(clearTasksQuerySchema, "query"),
  asyncHandler(ctrl.clearTasks),
);
tasksRouter.patch(
  "/:id",
  validate(taskParamsSchema, "params"),
  validate(updateTaskSchema),
  asyncHandler(ctrl.updateTask),
);
tasksRouter.delete(
  "/:id",
  validate(taskParamsSchema, "params"),
  asyncHandler(ctrl.deleteTask),
);
