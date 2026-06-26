import jwt from "jsonwebtoken";
import { env } from "../env.js";
import { Errors } from "./errors.js";

// Корисне навантаження access-токена. Тримаємо мінімум — лише `sub` (userId).
// Роль/план НЕ кладемо в токен: вони можуть змінитись, тож читаємо з БД у /auth/me.
interface AccessPayload {
  sub: string;
}

// Підписуємо завжди ПОТОЧНИМ секретом; перевіряємо проти поточного, а потім (якщо заданий)
// попереднього — щоб ротація секрету не інвалідувала всі живі токени миттєво (zero-downtime).
const verifySecrets = [
  env.JWT_ACCESS_SECRET,
  env.JWT_ACCESS_SECRET_PREVIOUS,
].filter((s): s is string => Boolean(s));

export const signAccessToken = (userId: string): string =>
  jwt.sign({ sub: userId } satisfies AccessPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  } as jwt.SignOptions);

/** Перевіряє підпис + строк дії access-токена; повертає userId або кидає 401. */
export const verifyAccessToken = (token: string): string => {
  for (const secret of verifySecrets) {
    try {
      const decoded = jwt.verify(token, secret);
      if (
        typeof decoded === "object" &&
        decoded &&
        typeof decoded.sub === "string"
      ) {
        return decoded.sub;
      }
      // Валідний підпис, але кривий payload — далі пробувати інший секрет немає сенсу.
      throw Errors.unauthenticated("Malformed token");
    } catch (err) {
      // Підпис не зійшовся під цим секретом — пробуємо наступний (ротація).
      if (err instanceof jwt.JsonWebTokenError) continue;
      throw Errors.unauthenticated("Invalid or expired token");
    }
  }
  throw Errors.unauthenticated("Invalid or expired token");
};
