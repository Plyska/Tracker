import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Обгортка async-контролерів: ловить reject проміса й передає в next(err),
 * щоб не дублювати try/catch у кожному хендлері (Express 4 не ловить async-помилки сам).
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
