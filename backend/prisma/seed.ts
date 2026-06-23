import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Демо-дані для локальної розробки. Паритет із фронтовим сідом (shared/api/mock/db.ts).
// Запуск: npm run db:seed. Idempotent — upsert за email.

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@tracker.app";
const DEMO_PASSWORD = "password123";

const HABITS = [
  { name: "Reading", color: "#6d28d9", icon: "BookOpen" },
  { name: "Running", color: "#059669", icon: "Footprints" },
  { name: "Learning English", color: "#2563eb", icon: "Languages" },
  { name: "Wake up at 8 AM", color: "#ea580c", icon: "AlarmClock" },
  { name: "Morning workout", color: "#db2777", icon: "Dumbbell" },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, name: "Demo User", passwordHash },
  });

  // Сід навичок лише якщо в користувача їх ще нема (щоб не дублювати при повторному запуску).
  const existing = await prisma.habit.count({ where: { userId: user.id } });
  if (existing === 0) {
    await prisma.habit.createMany({
      data: HABITS.map((h) => ({ ...h, userId: user.id })),
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded user ${DEMO_EMAIL} (password: ${DEMO_PASSWORD}) with ${HABITS.length} habits.`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
