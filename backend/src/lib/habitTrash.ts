import { prisma } from "../prisma.js";

/** Скільки днів навичка живе в кошику до остаточного видалення. */
export const TRASH_RETENTION_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Момент остаточного видалення для навички, що потрапила в кошик у `deletedAt`. */
export const purgeAtFor = (deletedAt: Date): Date =>
  new Date(deletedAt.getTime() + TRASH_RETENTION_DAYS * DAY_MS);

/** Межа: усе, що в кошику раніше за цей момент, підлягає остаточному видаленню. */
const trashCutoff = (): Date => new Date(Date.now() - TRASH_RETENTION_DAYS * DAY_MS);

/**
 * Остаточно видаляє навички, що пробули в кошику довше за retention (каскад прибирає `HabitEntry`).
 * `userId` — опційний scope (lazy-purge при читанні кошика конкретного юзера); без нього — глобально (cron).
 */
export const purgeExpiredHabits = async (userId?: string): Promise<number> => {
  const { count } = await prisma.habit.deleteMany({
    where: {
      deletedAt: { not: null, lt: trashCutoff() },
      ...(userId ? { userId } : {}),
    },
  });
  return count;
};
