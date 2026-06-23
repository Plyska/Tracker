import type { RequestHandler } from "express";
import type { ZodTypeAny, z } from "zod";
import { Errors } from "../lib/errors.js";

type Source = "body" | "query" | "params";

/**
 * Валідація частини запиту zod-схемою. На успіх — пише розпарсене (з дефолтами/коерсією)
 * назад у req[source]; на помилку — 400 VALIDATION_ERROR з першим повідомленням.
 * Контролери читають уже типобезпечні дані.
 */
export const validate =
  (schema: ZodTypeAny, source: Source = "body"): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const first = result.error.issues[0];
      throw Errors.validation(
        first ? `${first.path.join(".") || source}: ${first.message}` : "Validation failed",
      );
    }
    // query/params у Express read-only за типами — присвоюємо через каст.
    (req as Record<Source, unknown>)[source] = result.data;
    next();
  };

// Хелпер виведення типу розпарсеного тіла.
export type Infer<T extends ZodTypeAny> = z.infer<T>;
