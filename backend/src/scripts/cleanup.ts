import { prisma } from "../prisma.js";
import { deleteExpiredRefreshTokens } from "../lib/refreshTokens.js";
import { purgeExpiredHabits } from "../lib/habitTrash.js";

/**
 * Очистка за розкладом (cron), напр. раз на добу:
 *   `npm run db:cleanup`  (cron: `0 3 * * *  cd backend && npm run db:cleanup`)
 * Можна винести у хмарний планувальник (Render Cron Job / GitHub Actions schedule).
 * Прибирає: прострочені refresh-токени + навички, що пробули в кошику довше за retention
 * (lazy-purge при читанні кошика — сітка безпеки; цей cron гарантує очистку й для неактивних юзерів).
 */
const main = async (): Promise<void> => {
  const [refreshTokens, trashedHabits] = await Promise.all([
    deleteExpiredRefreshTokens(),
    purgeExpiredHabits(),
  ]);
  console.log(
    JSON.stringify({
      kind: "cleanup",
      removed: { refreshTokens, trashedHabits },
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
