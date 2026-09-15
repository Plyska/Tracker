// Ініціалізація Sentry — НАЙПЕРШИЙ імпорт, до express і до всіх роутів.
//
// Саме `app.ts`, а не `server.ts`: на Vercel `listen` не викликається взагалі, платформа імпортує
// default-експорт звідси. Якби ініціалізація жила в `server.ts`, у проді Sentry не вмикався б, а
// локально працював — розбіжність, яку помічають найпізніше.
import "./instrument.js";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { env } from "./env.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { habitsRouter } from "./modules/habits/habit.routes.js";
import { entriesRouter } from "./modules/entries/entry.routes.js";
import { dailyLogsRouter } from "./modules/daily-log/daily-log.routes.js";
import { tasksRouter } from "./modules/tasks/task.routes.js";
import { statsRouter } from "./modules/stats/stats.routes.js";
import { preferencesRouter } from "./modules/preferences/preferences.routes.js";
import { aiRouter } from "./modules/ai/ai.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { hasSharedRateLimitStore } from "./lib/rateLimitStore.js";

export const createApp = () => {
  const app = express();

  // За reverse-proxy у проді (Vercel): довіряємо першому хопу, щоб rate-limit брав реальний
  // клієнтський IP з X-Forwarded-For (а не IP проксі).
  if (env.isProd) app.set("trust proxy", 1);

  /**
   * Лічильники rate-limit у проді мають бути спільними.
   *
   * На serverless інстансів кілька, і MemoryStore веде окремий лічильник на кожному — захист від
   * перебору паролів тихо слабшає рівно тоді, коли трафік росте. Це деградація, а не поломка
   * (лімітер усе ще рахує), тому не фейлимо старт як із поштою, — але мовчати про це не можна:
   * інакше про межу дізнаються з інциденту.
   */
  if (env.isProd && !hasSharedRateLimitStore()) {
    // eslint-disable-next-line no-console
    console.warn(
      "[rate-limit] No shared store: counters are per-instance, so effective limits scale with " +
        "the number of instances. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    );
  }

  // Security headers. CORP=cross-origin, бо API споживається з іншого origin (фронт ≠ API).
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  // CORS з credentials — щоб браузер слав httpOnly auth-cookie cross-origin.
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );

  // Глобальний rate-limit — після cors (preflight OPTIONS не рахуються в ліміт).
  app.use(apiLimiter);

  // Ліміт тіла підвищено під data-URL аватара (base64 ~256px-зображення). Ще одна межа —
  // zod-валідація довжини `avatarUrl` (auth.schema). apiLimiter обмежує частоту зловживань.
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Маршрути монтуються в корінь → фронтовий VITE_API_URL = http://localhost:3000
  app.use("/auth", authRouter);
  app.use("/habits", habitsRouter);
  app.use("/entries", entriesRouter);
  app.use("/daily-logs", dailyLogsRouter);
  app.use("/tasks", tasksRouter);
  app.use("/stats", statsRouter);
  app.use("/me/preferences", preferencesRouter);
  // AI-компаньйон (ADR 0012): підказки (без LLM), лист тижня, квоти, експорт/видалення даних.
  app.use("/ai", aiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

/**
 * Готовий застосунок як default-експорт — точка входу для Vercel.
 *
 * Vercel шукає Express у `src/app.ts` / `src/index.ts` / `src/server.ts` і бере або default-експорт,
 * або файл, що слухає порт. `server.ts` підходив би за другою умовою, але `src/app.ts` сканується
 * раніше — і без цього рядка Vercel знайшов би тут лише іменовану фабрику й не зрозумів би, що
 * запускати. Явний експорт знімає залежність від порядку сканування.
 *
 * На serverless `listen` не викликається взагалі: платформа сама приймає запити в цей застосунок.
 * `server.ts` лишається для локального `npm run dev` і будь-якого класичного хостингу.
 */
export default createApp();
