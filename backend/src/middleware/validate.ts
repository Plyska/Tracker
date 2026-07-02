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
    // Пишемо розпарсене назад у req[source]. Express 5: `req.query` — гетер без сетера
    // (обчислюється з URL), тож пряме присвоєння кидає TypeError — перевизначаємо власною
    // властивістю інстансу (перекриває прототипний гетер). `body`/`params` лишаються звичайними
    // властивостями → присвоюємо напряму.
    if (source === "query") {
      Object.defineProperty(req, "query", {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      (req as Record<Source, unknown>)[source] = result.data;
    }
    next();
  };

// Хелпер виведення типу розпарсеного тіла.
export type Infer<T extends ZodTypeAny> = z.infer<T>;
