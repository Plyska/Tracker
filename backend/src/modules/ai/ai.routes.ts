import { Router } from "express";
import { env } from "../../env.js";
import { Errors } from "../../lib/errors.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireCsrf } from "../../lib/csrf.js";
import { validate } from "../../middleware/validate.js";
import { aiLimiter } from "../../middleware/rateLimit.js";
import {
  chatBodySchema,
  checkinBodySchema,
  insightsQuerySchema,
  quotaQuerySchema,
  reflectionBodySchema,
  reflectionsQuerySchema,
} from "./ai.schema.js";
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

// Лист-підсумок. POST (а не GET), бо генерація — операція зі спонукальним ефектом:
// створює рядок і витрачає квоту. Повторний виклик у межах періоду віддає кеш.
aiRouter.post(
  "/reflection",
  validate(reflectionBodySchema),
  asyncHandler(ctrl.postReflection),
);
aiRouter.get(
  "/reflections",
  validate(reflectionsQuerySchema, "query"),
  asyncHandler(ctrl.getReflections),
);

// Чек-ін: розбір тексту на дії. Нічого не записує — запис іде через /entries, /daily-logs,
// /tasks після підтвердження на клієнті (модель не пише в БД, ADR 0012).
aiRouter.post("/checkin", validate(checkinBodySchema), asyncHandler(ctrl.postCheckin));

/**
 * Чат потоком (SSE). Історія не зберігається — приходить у тілі щоразу.
 *
 * **Вимкнено до запуску** (`AI_CHAT_ENABLED`). Гейт стоїть саме тут, на сервері, а не лише в UI:
 * приховати кнопку — не захист, ендпоінт лишався б доступним кожному, хто вміє скласти запит.
 *
 * Причина в природі саме цієї ручки: чек-ін і підказки працюють із власними даними користувача
 * за нашим шаблоном, а чат приймає **довільний текст** і віддає його моделі разом із контекстом
 * акаунта. Це інший клас ризику — prompt injection, спроби вигребти чужий контекст, накрутка
 * рахунку за токени. Вмикати, коли для цього буде окремий захист.
 */
aiRouter.post(
  "/chat",
  (_req, _res, next) => next(env.aiChatEnabled ? undefined : Errors.aiChatDisabled()),
  validate(chatBodySchema),
  asyncHandler(ctrl.postChat),
);

aiRouter.get("/quota", validate(quotaQuerySchema, "query"), asyncHandler(ctrl.getAiQuota));

// GDPR-готовність: експорт і видалення AI-шару.
aiRouter.get("/data", asyncHandler(ctrl.exportAiData));
aiRouter.delete("/data", asyncHandler(ctrl.deleteAiData));
