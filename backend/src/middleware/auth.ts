import type { RequestHandler } from "express";
import { verifyAccessToken } from "../lib/jwt.js";
import { Errors } from "../lib/errors.js";

/**
 * Захист роутів: читає `Authorization: Bearer <access-jwt>`, валідує й кладе `req.userId`.
 * Без/невалідний токен → 401 (через error-handler). Роль/доступ перевіряємо нижче за потреби.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw Errors.unauthenticated("Missing Bearer token");
  }
  req.userId = verifyAccessToken(header.slice("Bearer ".length).trim());
  next();
};
