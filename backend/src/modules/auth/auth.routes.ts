import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireCsrf } from "../../lib/csrf.js";
import { authLimiter, emailLimiter } from "../../middleware/rateLimit.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from "./auth.schema.js";
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
// Оновлення профілю — мутація від імені сесії: requireAuth + CSRF (double-submit) + валідація.
authRouter.patch(
  "/me",
  requireAuth,
  requireCsrf,
  validate(updateProfileSchema),
  asyncHandler(ctrl.updateMe),
);

/**
 * Флоу з листами.
 *
 * Без CSRF і без `requireAuth` там, де діє токен із листа: людина відкриває посилання, не маючи
 * сесії — саме тому, що втратила доступ. Авторизація тут — сам одноразовий токен.
 *
 * `emailLimiter` (не `authLimiter`) рахує ВСІ запити: ці ендпоінти віддають 204 завжди, тож під
 * лімітером, що пропускає успішні, ліміту не було б зовсім.
 */
authRouter.post(
  "/forgot-password",
  emailLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(ctrl.forgotPassword),
);
authRouter.post(
  "/reset-password",
  emailLimiter,
  validate(resetPasswordSchema),
  asyncHandler(ctrl.resetPasswordHandler),
);
authRouter.post(
  "/verify-email",
  emailLimiter,
  validate(verifyEmailSchema),
  asyncHandler(ctrl.verifyEmailHandler),
);
// Повторне надсилання — для залогіненого: адресу беремо з сесії, а не з тіла, інакше ендпоінт
// став би розсильником листів на будь-яку чужу пошту.
authRouter.post(
  "/verify-email/request",
  requireAuth,
  requireCsrf,
  emailLimiter,
  asyncHandler(ctrl.requestVerification),
);
// Зміна пароля — мутація від імені сесії, тож CSRF обовʼязковий.
authRouter.post(
  "/change-password",
  requireAuth,
  requireCsrf,
  validate(changePasswordSchema),
  asyncHandler(ctrl.changePasswordHandler),
);

// Шов OAuth (Google відкладено) — 501.
authRouter.post("/oauth/:provider", asyncHandler(ctrl.oauth));
