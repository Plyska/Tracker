import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

// Singleton PrismaClient. У dev `tsx watch` перезапускає процес повністю,
// тож глобального кешу між reload не треба — достатньо одного інстансу на процес.
export const prisma = new PrismaClient({
  log: env.isProd ? ["error"] : ["warn", "error"],
});
