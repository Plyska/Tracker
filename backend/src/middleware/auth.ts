import type { RequestHandler } from "express";
import { verifyAccessToken } from "../lib/jwt.js";
import { Errors } from "../lib/errors.js";
import { ACCESS_COOKIE } from "../lib/cookies.js";

/**
 * Захист роутів: читає access-JWT із httpOnly cookie `access_token`, валідує й кладе `req.userId`.
 * Без/невалідний токен → 401 (через error-handler). Токен у cookie (не `Bearer`): JS на фронті
 * його не бачить (захист від XSS-крадіжки); мутації додатково захищає CSRF (`requireCsrf`).
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[ACCESS_COOKIE] as string | undefined;
  if (!token) {
    throw Errors.unauthenticated("Missing access token");
  }
  req.userId = verifyAccessToken(token);
  next();
};
