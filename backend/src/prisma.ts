import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env.js";

// Prisma 7: рантайм-конект через driver adapter (node-postgres). Беремо пулер `DATABASE_URL`
// (рантайм), не прямий `DIRECT_URL` (той — лише для міграцій у prisma.config.ts).
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

// Singleton PrismaClient. У dev `tsx watch` перезапускає процес повністю,
// тож глобального кешу між reload не треба — достатньо одного інстансу на процес.
export const prisma = new PrismaClient({
  adapter,
  log: env.isProd ? ["error"] : ["warn", "error"],
});
