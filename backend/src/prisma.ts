import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env.js";

// Prisma 7: рантайм-конект через driver adapter (node-postgres). Беремо пулер `DATABASE_URL`
// (рантайм), не прямий `DIRECT_URL` (той — лише для міграцій у prisma.config.ts).
//
// Neon scale-to-zero: compute засинає за ~5 хв БЕЗ ЗАПИТІВ (не з'єднань). Ми нічого не
// пінгуємо періодично (health-check не чіпає БД, конект лінивий), тож у простої база спить і
// CU-години не витрачаються. Пул тримаємо малим і швидко закриваємо idle-з'єднання, щоб до
// засинання compute не лишалось відкритих конектів (чистий суспенд без stale-connection помилок)
// і щоб не з'їдати ліміт з'єднань Neon. Пулер Neon (PgBouncer) сам фанить конкурентність, тож
// клієнтський `max` може бути невеликим.
//
// `max` різний за середовищем, бо різна одиниця масштабування. Локально процес один, і 10
// з'єднань — це стеля одного процесу. На Vercel (Fluid compute) процесів кілька, і `max`
// множиться на їх кількість: 10 × десяток інстансів під навантаженням упирається в ліміт
// з'єднань Neon рівно на піку. Fluid обробляє кілька запитів одним інстансом, тож одного
// з'єднання замало — але 3 вистачає, а решту конкурентності бере на себе пулер.
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: env.isProd ? 3 : 10,
  idleTimeoutMillis: 10_000,
});

// Singleton PrismaClient. У dev `tsx watch` перезапускає процес повністю,
// тож глобального кешу між reload не треба — достатньо одного інстансу на процес.
export const prisma = new PrismaClient({
  adapter,
  log: env.isProd ? ["error"] : ["warn", "error"],
});
