import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../prisma.js";
import { Errors } from "./errors.js";

/**
 * Одноразові токени з листів: підтвердження адреси й скидання пароля.
 *
 * Дзеркалить `refreshTokens.ts` там, де це доречно: сирий токен існує лише в листі, у БД лежить
 * **SHA-256 хеш**. Дамп бази не має давати змоги скинути комусь пароль.
 */

export type EmailTokenType = "verify" | "reset";

/**
 * Терміни життя різні, бо різна ціна помилки. Скидання пароля — вікно, у якому чужа людина з
 * доступом до пошти може забрати акаунт, тож година. Підтвердження адреси нічого не відмикає,
 * а протухле посилання коштує людині повторного запиту — тож доба.
 */
export const TOKEN_TTL_HOURS: Record<EmailTokenType, number> = { verify: 24, reset: 1 };

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

/**
 * Видати токен. Попередні НЕВИКОРИСТАНІ токени того самого типу гасимо.
 *
 * Інакше кожен повторний «надішліть ще раз» лишав би по собі живе посилання, і найстаріший лист у
 * скриньці працював би нарівні з найновішим — тобто вікно атаки росло б із кожним натисканням.
 */
export const issueEmailToken = async (
  userId: string,
  type: EmailTokenType,
): Promise<{ token: string; expiresAt: Date }> => {
  const now = Date.now();
  await prisma.emailToken.updateMany({
    where: { userId, type, usedAt: null, expiresAt: { gt: new Date(now) } },
    data: { usedAt: new Date(now) },
  });

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now + TOKEN_TTL_HOURS[type] * 60 * 60 * 1000);
  await prisma.emailToken.create({
    data: { userId, type, tokenHash: sha256(token), expiresAt },
  });
  return { token, expiresAt };
};

/**
 * Спожити токен: перевірити й одразу позначити використаним. Повертає `userId`.
 *
 * Одна й та сама помилка на всі причини (немає / чужий тип / протух / уже використаний) — навмисно:
 * розрізнення дало б змогу перебирати токени й дізнаватись, які колись існували.
 *
 * `updateMany` з умовою `usedAt: null` замість «прочитати → записати» робить споживання атомарним:
 * два одночасні кліки по одному посиланню не можуть обидва вважатися успішними.
 */
export const consumeEmailToken = async (
  rawToken: string,
  type: EmailTokenType,
): Promise<string> => {
  const tokenHash = sha256(rawToken);
  const row = await prisma.emailToken.findUnique({
    where: { tokenHash },
    select: { userId: true, type: true, expiresAt: true, usedAt: true },
  });
  if (!row || row.type !== type || row.usedAt || row.expiresAt <= new Date()) {
    throw Errors.invalidToken();
  }

  const claimed = await prisma.emailToken.updateMany({
    where: { tokenHash, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) throw Errors.invalidToken();

  return row.userId;
};

/** Прибирання простроченого — для `db:cleanup` (разом із refresh-токенами). */
export const deleteExpiredEmailTokens = async (): Promise<number> => {
  const { count } = await prisma.emailToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
};
