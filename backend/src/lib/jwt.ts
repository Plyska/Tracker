import jwt from "jsonwebtoken";
import { env } from "../env.js";
import { Errors } from "./errors.js";

// Корисне навантаження access-токена. Тримаємо мінімум — лише `sub` (userId).
// Роль/план НЕ кладемо в токен: вони можуть змінитись, тож читаємо з БД у /auth/me.
interface AccessPayload {
  sub: string;
}

export const signAccessToken = (userId: string): string =>
  jwt.sign({ sub: userId } satisfies AccessPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  } as jwt.SignOptions);

/** Перевіряє підпис + строк дії access-токена; повертає userId або кидає 401. */
export const verifyAccessToken = (token: string): string => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof decoded === "object" && decoded && typeof decoded.sub === "string") {
      return decoded.sub;
    }
    throw Errors.unauthenticated("Malformed token");
  } catch {
    throw Errors.unauthenticated("Invalid or expired token");
  }
};
