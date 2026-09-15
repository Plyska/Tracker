import type { RequestHandler } from "express";
import { verifyAccessToken } from "../lib/jwt.js";
import { Errors } from "../lib/errors.js";
import { ACCESS_COOKIE } from "../lib/cookies.js";

/**
 * Розширення типу `Request` живе тут — у файлі, який `req.userId` і виставляє.
 *
 * Не окремим `.d.ts`: такий файл потрапляє в компіляцію лише скануванням теки за `include`, і
 * нативний компілятор TypeScript 7 робить це неоднаково на різних платформах — локально (darwin)
 * розширення застосовувалось, а на збірці Vercel (linux) мовчки ні, і деплой падав на сорока двох
 * `Property 'userId' does not exist`. Тут воно в модулі, який імпортують звідусіль, тож у графі
 * опиняється завжди.
 *
 * І не окремим `.ts` з самим лише оголошенням: Vercel компілює власним проходом від `app.ts`,
 * файл без рантайм-вмісту не емітить — і застосунок падав уже на старті, не знайшовши модуль.
 */
declare module "express-serve-static-core" {
  interface Request {
    /** Ставить `requireAuth`; до нього — `undefined`. */
    userId?: string;
  }
}

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
