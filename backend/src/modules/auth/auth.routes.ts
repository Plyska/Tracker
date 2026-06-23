import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { loginSchema, registerSchema } from "./auth.schema.js";
import * as ctrl from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), asyncHandler(ctrl.register));
authRouter.post("/login", validate(loginSchema), asyncHandler(ctrl.login));
authRouter.post("/refresh", asyncHandler(ctrl.refresh));
authRouter.post("/logout", asyncHandler(ctrl.logout));
authRouter.get("/me", requireAuth, asyncHandler(ctrl.me));

// Шов OAuth (Google відкладено) — 501.
authRouter.post("/oauth/:provider", asyncHandler(ctrl.oauth));
