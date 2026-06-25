import { prisma } from "../prisma.js";
import { deleteExpiredRefreshTokens } from "../lib/refreshTokens.js";

/**
 * Очистка прострочених refresh-токенів. Запуск за розкладом (cron), напр. раз на добу:
 *   `npm run db:cleanup`  (cron: `0 3 * * *  cd backend && npm run db:cleanup`)
 * Можна винести у хмарний планувальник (Render Cron Job / GitHub Actions schedule).
 */
const main = async (): Promise<void> => {
  const removed = await deleteExpiredRefreshTokens();
  console.log(
    JSON.stringify({
      kind: "cleanup",
      task: "refresh_tokens",
      removed,
      at: new Date().toISOString(),
    }),
  );
};

main()
  .catch((err) => {
    console.error("cleanup failed:", err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
