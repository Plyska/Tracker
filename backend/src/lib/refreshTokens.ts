import { createHash, randomBytes, randomUUID } from "node:crypto";
import { prisma } from "../prisma.js";
import { env } from "../env.js";
import { Errors } from "./errors.js";
import { audit } from "./audit.js";

/**
 * Refresh-токени з ротацією та виявленням повторного використання.
 *
 * - Видаємо непрозорий випадковий токен (32 байти). У БД — лише його SHA-256 хеш.
 * - Кожен токен належить `family` (ланцюг ротації). При refresh старий токен відкликаємо
 *   й видаємо новий у тій самій родині.
 * - Reuse-detection: якщо приходить уже відкликаний токен — це ознака крадіжки →
 *   відкликаємо ВСЮ родину (всі активні сесії цього ланцюга).
 */

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const ttlMs = () => env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

export interface IssuedRefresh {
  token: string; // сирий токен (іде в cookie) — у БД не зберігається
  expiresAt: Date;
}

const createToken = async (
  userId: string,
  family: string,
  now: number,
): Promise<IssuedRefresh> => {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now + ttlMs());
  await prisma.refreshToken.create({
    data: { userId, family, tokenHash: sha256(token), expiresAt },
  });
  return { token, expiresAt };
};

/** Нова родина токенів (логін/реєстрація). */
export const issueRefreshToken = (userId: string): Promise<IssuedRefresh> =>
  createToken(userId, randomUUID(), Date.now());

export interface RotationResult extends IssuedRefresh {
  userId: string;
}

/**
 * Ротація: валідуємо вхідний токен, відкликаємо його, видаємо новий у тій самій родині.
 * Невідомий/прострочений → 401. Повторно використаний відкликаний → revoke всієї родини + 401.
 */
export const rotateRefreshToken = async (
  rawToken: string,
): Promise<RotationResult> => {
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(rawToken) },
  });

  if (!existing) throw Errors.unauthenticated("Invalid refresh token");

  // Reuse-detection: відкликаний токен прийшов знову → компрометація родини.
  if (existing.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { family: existing.family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    audit("refresh.reuse_detected", {
      userId: existing.userId,
      family: existing.family,
    });
    throw Errors.unauthenticated("Refresh token reuse detected");
  }

  if (existing.expiresAt.getTime() < Date.now()) {
    throw Errors.unauthenticated("Refresh token expired");
  }

  const now = Date.now();
  // Відкликаємо поточний і видаємо наступний у транзакції (атомарна ротація).
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date(now) },
  });
  const next = await createToken(existing.userId, existing.family, now);
  return { ...next, userId: existing.userId };
};

/** Відкликати конкретний токен (logout). Idempotent — невідомий токен ігноруємо. */
export const revokeRefreshToken = async (rawToken: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

/**
 * Прибирання **прострочених** рядків refresh-токенів (для cron, `npm run db:cleanup`).
 * Видаляємо лише `expiresAt < now` — відкликані-але-ще-не-прострочені лишаємо, бо вони потрібні
 * reuse-detection (видалений токен виглядав би як «невідомий», а не як «повторно використаний»).
 * Повертає кількість видалених рядків.
 */
export const deleteExpiredRefreshTokens = async (): Promise<number> => {
  const { count } = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
};
