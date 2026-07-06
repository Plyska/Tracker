import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Демо-дані для звичок із ТИЖНЕВОЮ ЦІЛЛЮ (weeklyTarget) на тестовому акаунті — щоб перевірити
 * статистику (ADR 0010). Дані ДЕТЕРМІНОВАНІ (без random), щоб очікувані показники були відомі.
 * Idempotent: видаляє ці 3 звички за назвою й перестворює. Запуск: npx tsx prisma/seedWeeklyHabits.ts
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const TARGET_EMAIL = "test@tracker.app";

const toISO = (d: Date): string => d.toISOString().slice(0, 10);
const addDaysISO = (iso: string, n: number): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return toISO(new Date(Date.UTC(y, m - 1, d + n)));
};
const mondayThisWeek = (): string => {
  const t = new Date();
  const dow = (t.getUTCDay() + 6) % 7; // 0=Mon
  return addDaysISO(toISO(t), -dow);
};

// Звички з тижневою ціллю. `weekDone(kWeeksAgo)` → масив weekday-офсетів (0=Пн … 6=Нд), у які
// стоятиме відмітка «виконано». k=0 — поточний (незавершений) тиждень.
const HABITS = [
  {
    name: "Зал",
    color: "#db2777",
    icon: "Dumbbell",
    weeklyTarget: 3,
    weekDone: (k: number): number[] => {
      if (k === 0) return [0]; // поточний тиждень: лише понеділок (сьогодні) → бейдж 1/3
      if (k === 1) return [0, 2, 4, 5]; // минулий тиждень: 4 рази → тест капу (рахується як 3/3)
      return [0, 2, 4]; // решта повних тижнів: рівно 3 (Пн/Ср/Пт) → 100%
    },
  },
  {
    name: "Генеральне прибирання",
    color: "#0891b2",
    icon: "Sparkles",
    weeklyTarget: 2,
    weekDone: (k: number): number[] => {
      if (k === 0) return []; // цього тижня ще не робив
      return k % 2 === 1 ? [0] : [0, 1]; // непарні тижні тому — 1 раз (недобір), парні — 2 (ціль)
    },
  },
  {
    name: "Дзвінок батькам",
    color: "#f59e0b",
    icon: "Phone",
    weeklyTarget: 1,
    weekDone: (k: number): number[] => (k === 0 ? [] : [6]), // 1 раз щонеділі, крім поточного тижня
  },
];

const WEEKS_BACK = 12; // скільки повних тижнів історії

async function main() {
  const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!user) throw new Error(`User ${TARGET_EMAIL} not found`);

  const thisMonday = mondayThisWeek();
  const createdAt = new Date(`${addDaysISO(thisMonday, -WEEKS_BACK * 7)}T08:00:00.000Z`);
  const today = toISO(new Date());

  for (const h of HABITS) {
    // Idempotent: прибрати попередній прогон цієї звички (разом з відмітками — каскад).
    await prisma.habit.deleteMany({ where: { userId: user.id, name: h.name } });

    const habit = await prisma.habit.create({
      data: {
        userId: user.id,
        name: h.name,
        color: h.color,
        icon: h.icon,
        weeklyTarget: h.weeklyTarget,
        createdAt,
      },
    });

    const entries: { habitId: string; date: string; done: boolean }[] = [];
    for (let k = WEEKS_BACK; k >= 0; k--) {
      const weekMonday = addDaysISO(thisMonday, -k * 7);
      for (const offset of h.weekDone(k)) {
        const date = addDaysISO(weekMonday, offset);
        if (date > today) continue; // не створюємо майбутні відмітки
        entries.push({ habitId: habit.id, date, done: true });
      }
    }
    await prisma.habitEntry.createMany({ data: entries });
    console.log(`${h.name} (target ${h.weeklyTarget}): ${entries.length} entries, createdAt ${toISO(createdAt)}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
