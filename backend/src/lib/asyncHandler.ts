import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Обгортка async-контролерів: ловить reject проміса й передає в next(err), щоб не дублювати
 * try/catch у кожному хендлері. Дженерик по route-params `P` — щоб типізовані хендлери
 * (напр. `Request<{ id: string }>`) проходили без втрати типу параметрів.
 *
 * Примітка: Express 5 сам ловить reject із хендлерів, що ПОВЕРТАЮТЬ проміс; лишаємо обгортку
 * для явності й одноманітності (частина хендлерів не повертає проміс).
 */
export const asyncHandler =
  <P>(
    fn: (req: Request<P>, res: Response, next: NextFunction) => Promise<unknown>,
  ): RequestHandler<P> =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
