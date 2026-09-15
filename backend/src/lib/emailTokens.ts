import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "../prisma.js";
import { Errors } from "./errors.js";

/**
 * Одноразові секрети з листів. Їх два, і вони навмисно різні за формою:
 *
 * - **`verify` — 6-значний код**, який людина переписує руками. Пошту підтверджують одразу після
 *   реєстрації, часто читаючи лист на телефоні, а реєструючись на ноутбуці; посилання в цьому
 *   сценарії відкривається «не в тій» вкладці, без сесії, і людина губиться. Код переноситься між
 *   пристроями очима.
 * - **`reset` — довге посилання**. Тут навпаки: людина приходить із листа без сесії, і секрет
 *   мусить сам себе авторизувати, тобто бути неперебірним.
 *
 * Спільне з `refreshTokens.ts`: сирий секрет існує лише в листі, у БД лежить **SHA-256 хеш**.
 * Дамп бази не має давати змоги скинути комусь пароль.
 */

export type EmailTokenType = "verify" | "reset";

/**
 * Терміни життя різні, бо різна ціна помилки й різна ентропія.
 *
 * Посилання на скидання пароля — вікно, у якому чужа людина з доступом до пошти може забрати
 * акаунт, тож година. Код підтвердження нічого не відмикає, але в нього всього 10^6 значень, і
 * довге вікно — це довге вікно для перебору; 30 хв вистачає, щоб дійти від реєстрації до скриньки.
 */
export const VERIFY_CODE_TTL_MINUTES = 30;
export const RESET_TTL_HOURS = 1;

/**
 * Скільки разів можна помилитись, перш ніж код згорить.
 *
 * Це головний захист коду, не rate-limiter: лімітер рахує на IP і його обходять, а лічильник
 * живе на самому коді. 5 спроб проти 10^6 значень — шанс вгадати 1 до 200 000 за життя коду.
 * Згорілий код не «блокує акаунт»: людина просто просить новий.
 */
export const VERIFY_CODE_MAX_ATTEMPTS = 5;

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

/**
 * Хеш коду солиться `userId`.
 *
 * Без солі два користувачі рано чи пізно отримають однаковий код, і другий `create` впаде на
 * `tokenHash @unique` — тобто людина не змогла б зареєструватись через чужий збіг. Сіль заразом
 * прибирає й глобальний пошук за кодом: знайти рядок можна лише знаючи, чий він.
 */
const codeHash = (userId: string, code: string): string => sha256(`${userId}:${code}`);

/** Порівняння сталого часу — щоб відповідь сервера не підказувала, наскільки код «майже вгаданий». */
const hashesEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
};

/**
 * Погасити попередні невикористані секрети того самого типу.
 *
 * Інакше кожен повторний «надішліть ще раз» лишав би по собі живий код, і найстаріший лист у
 * скриньці працював би нарівні з найновішим — тобто вікно атаки росло б із кожним натисканням.
 */
const invalidatePrevious = async (userId: string, type: EmailTokenType, now: Date): Promise<void> => {
  await prisma.emailToken.updateMany({
    where: { userId, type, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
};

/**
 * Видати 6-значний код підтвердження.
 *
 * `randomInt` — криптографічний і **рівномірний**: наївне `Math.random()` чи `% 1_000_000` дали б
 * перекіс, а перекіс у коді з мільйона значень — це вже не мільйон.
 */
export const issueVerificationCode = async (userId: string): Promise<{ code: string }> => {
  const now = new Date();
  await invalidatePrevious(userId, "verify", now);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.emailToken.create({
    data: {
      userId,
      type: "verify",
      tokenHash: codeHash(userId, code),
      expiresAt: new Date(now.getTime() + VERIFY_CODE_TTL_MINUTES * 60 * 1000),
    },
  });
  return { code };
};

/**
 * Спожити код підтвердження. Шукаємо **лише серед кодів цього користувача** — інакше 6 цифр
 * відмикали б «будь-який акаунт, у якого зараз такий код», а це зовсім інша задача для атакувальника.
 *
 * Помилка одна на всі причини (немає / протух / згорів / не збігся): розрізнення нічого не дає
 * людині, яка просто помилилась цифрою, зате дає атакувальнику зворотний звʼязок.
 */
export const consumeVerificationCode = async (userId: string, code: string): Promise<void> => {
  const now = new Date();
  const row = await prisma.emailToken.findFirst({
    where: { userId, type: "verify", usedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
    select: { id: true, tokenHash: true, attempts: true },
  });
  if (!row) throw Errors.invalidCode();

  if (!hashesEqual(row.tokenHash, codeHash(userId, code))) {
    // Невдала спроба наближає код до згоряння. Пишемо через `increment`, щоб паралельні спроби
    // не загубили лічильник (read-modify-write тут дав би атакувальнику безкоштовні спроби).
    const spent = row.attempts + 1;
    await prisma.emailToken.update({
      where: { id: row.id },
      data: {
        attempts: { increment: 1 },
        ...(spent >= VERIFY_CODE_MAX_ATTEMPTS && { usedAt: now }),
      },
    });
    throw Errors.invalidCode();
  }

  // Атомарне споживання (умова `usedAt: null`) замість «прочитати → записати»: два одночасні
  // натискання «підтвердити» не можуть обидва вважатися успішними.
  const claimed = await prisma.emailToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: now },
  });
  if (claimed.count === 0) throw Errors.invalidCode();
};

/**
 * Видати непередбачуваний токен для посилання (скидання пароля). 32 байти — перебору не підлягає,
 * тож ні лічильника спроб, ні прив'язки до користувача тут не треба: токен сам себе авторизує.
 */
export const issueEmailToken = async (
  userId: string,
  type: EmailTokenType,
): Promise<{ token: string; expiresAt: Date }> => {
  const now = new Date();
  await invalidatePrevious(userId, type, now);

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + RESET_TTL_HOURS * 60 * 60 * 1000);
  await prisma.emailToken.create({
    data: { userId, type, tokenHash: sha256(token), expiresAt },
  });
  return { token, expiresAt };
};

/**
 * Спожити токен із посилання: перевірити й одразу позначити використаним. Повертає `userId`.
 *
 * Одна й та сама помилка на всі причини (немає / чужий тип / протух / уже використаний) — навмисно:
 * розрізнення дало б змогу перебирати токени й дізнаватись, які колись існували.
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
