import { prisma } from "../../prisma.js";
import { env } from "../../env.js";
import { Errors } from "../../lib/errors.js";

/**
 * Денна квота LLM-викликів на користувача (ADR 0012).
 *
 * Дві межі, різні за призначенням:
 *  - `aiLimiter` (middleware) — сплески за хвилину, захист від циклів/скриптів;
 *  - ця квота — ДЕННА стеля вартості. Саме вона тримає рахунок передбачуваним, бо на
 *    безкоштовному тирі ліміти рахуються на ключ, а не на користувача (план §3.5).
 *
 * `day` — локальна дата клієнта (як `to` у /stats): інакше квота «скидалась» би опівночі UTC,
 * тобто серед дня для частини користувачів.
 */

export interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
}

export async function getQuota(userId: string, day: string): Promise<QuotaStatus> {
  const row = await prisma.aiUsage.findUnique({ where: { userId_day: { userId, day } } });
  const used = row?.messages ?? 0;
  const limit = env.aiDailyMessageLimit;
  return { used, limit, remaining: Math.max(0, limit - used) };
}

/** Кинути 429, якщо ліміт вичерпано. Викликати ПЕРЕД зверненням до провайдера. */
export async function assertQuota(userId: string, day: string): Promise<void> {
  const { remaining } = await getQuota(userId, day);
  if (remaining <= 0) throw Errors.aiQuotaExceeded();
}

/**
 * Зафіксувати витрату після успішного виклику. Рахуємо ПІСЛЯ відповіді, щоб невдалий виклик
 * (збій провайдера) не «з'їдав» квоту користувача — та сама логіка, що `skipSuccessfulRequests`
 * навпаки в authLimiter.
 */
export async function consumeQuota(
  userId: string,
  day: string,
  inputTokens: number,
  outputTokens: number,
  /**
   * `false` — записати ВАРТІСТЬ, але не списувати повідомлення. Рівно один випадок: кризовий
   * скрин (`ai.crisis.ts`). Він коштує ≈350 токенів проти ≈4 200 у звичайного виклику, тобто як
   * повідомлення обраховувався б удванадцятеро дорожче за себе — і найдорожче саме для того,
   * хто написав щось тривожне. Запобіжник не має скорочувати людині день.
   * Токени лишаються в обліку: вони справді витрачені й тиснуть на спільну стелю провайдера.
   */
  countsAsMessage = true,
): Promise<void> {
  const messages = countsAsMessage ? 1 : 0;
  await prisma.aiUsage.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, messages, inputTokens, outputTokens },
    update: {
      messages: { increment: messages },
      inputTokens: { increment: inputTokens },
      outputTokens: { increment: outputTokens },
    },
  });
}
