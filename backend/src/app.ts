import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { env } from "./env.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { habitsRouter } from "./modules/habits/habit.routes.js";
import { entriesRouter } from "./modules/entries/entry.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

export const createApp = () => {
  const app = express();

  // CORS з credentials — щоб браузер слав httpOnly refresh-cookie на /auth/refresh.
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
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
