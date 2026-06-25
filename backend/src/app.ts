import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { env } from "./env.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { habitsRouter } from "./modules/habits/habit.routes.js";
import { entriesRouter } from "./modules/entries/entry.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

export const createApp = () => {
  const app = express();

  // За reverse-proxy у проді (Render/Railway): довіряємо першому хопу, щоб rate-limit брав
  // реальний клієнтський IP з X-Forwarded-For (а не IP проксі).
  if (env.isProd) app.set("trust proxy", 1);

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

  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Маршрути монтуються в корінь → фронтовий VITE_API_URL = http://localhost:3000
  app.use("/auth", authRouter);
  app.use("/habits", habitsRouter);
  app.use("/entries", entriesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
