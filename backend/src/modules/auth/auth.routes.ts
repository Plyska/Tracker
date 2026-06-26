import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireCsrf } from "../../lib/csrf.js";
import { authLimiter } from "../../middleware/rateLimit.js";
import { loginSchema, registerSchema } from "./auth.schema.js";
import * as ctrl from "./auth.controller.js";

export const authRouter = Router();

// Bootstrap-роути (register/login/refresh) — без CSRF: вони не діють від імені вже
// автентифікованої ambient-сесії (refresh захищений httpOnly-cookie + SameSite). Logout —
// з CSRF (у залогіненого є csrf-cookie), щоб чужий origin не міг примусово розлогінити.
// `authLimiter` — строгий ліміт проти брутфорсу (рахує лише невдалі спроби).
authRouter.post("/register", authLimiter, validate(registerSchema), asyncHandler(ctrl.register));
authRouter.post("/login", authLimiter, validate(loginSchema), asyncHandler(ctrl.login));
authRouter.post("/refresh", authLimiter, asyncHandler(ctrl.refresh));
authRouter.post("/logout", requireCsrf, asyncHandler(ctrl.logout));
authRouter.get("/me", requireAuth, asyncHandler(ctrl.me));

// Шов OAuth (Google відкладено) — 501.
authRouter.post("/oauth/:provider", asyncHandler(ctrl.oauth));
