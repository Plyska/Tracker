import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Демо-наповнення статистики для РЕАЛЬНОГО акаунта (щоб бачити віджети з даними).
 * Запуск: `npx tsx prisma/seedUserData.ts` (env із .env). Idempotent — перегенеровує
 * відмітки/настрій для керованих звичок. Звички з бекдейтнутим createdAt → є дані за рік/all-time.
 *
 * Налаштування мети — через TARGET_EMAIL.
 */
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TARGET_EMAIL = "andriy.plyska322@gmail.com";

// Профілі керованих звичок: вік (днів тому), базова частота виконання, внесок у настрій.
const PROFILES = [
  { name: "Morning workout", color: "#db2777", icon: "Dumbbell", daysAgo: 400, rate: 0.74, moodBoost: 0.9 },
  { name: "Read", color: "#6d28d9", icon: "BookOpen", daysAgo: 330, rate: 0.55, moodBoost: 0.25 },
  { name: "Meditate", color: "#059669", icon: "Brain", daysAgo: 260, rate: 0.66, moodBoost: 0.7 },
  { name: "Drink water", color: "#2563eb", icon: "Droplet", daysAgo: 365, rate: 0.85, moodBoost: 0.1 },
  { name: "No sugar", color: "#ea580c", icon: "Apple", daysAgo: 130, rate: 0.42, moodBoost: 0.35 },
  { name: "Journal", color: "#0891b2", icon: "Pencil", daysAgo: 95, rate: 0.5, moodBoost: 0.4 },
];

const MOOD_DAYS = 130; // за скільки останніх днів логуємо настрій
const ENTRY_WINDOW = 450; // верхня межа історії відміток

const NOTES = [
  "Productive day.",
  "Felt a bit tired.",
  "Great energy today!",
  "Stressful, but managed.",
  "Calm and focused.",
];

// ── date-хелпери (ISO 'YYYY-MM-DD') ──
const toISO = (d: Date): string => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return toISO(new Date(Date.UTC(y, m - 1, d + n)));
};
const isoDaysAgo = (n: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return toISO(d);
};
const isWeekend = (iso: string): boolean => {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 || wd === 6;
};
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

async function main() {
  const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!user) {
    throw new Error(`User ${TARGET_EMAIL} not found — register first, then re-run.`);
  }
  const today = toISO(new Date());

  // 1) Керовані звички: upsert за назвою + бекдейт createdAt.
  type Managed = { id: string; createdAt: string; rate: number; moodBoost: number };
  const managed: Managed[] = [];
  for (const p of PROFILES) {
    const createdAt = new Date(`${isoDaysAgo(p.daysAgo)}T08:00:00.000Z`);
    const existing = await prisma.habit.findFirst({
      where: { userId: user.id, name: p.name },
      select: { id: true },
    });
    const habit = existing
      ? await prisma.habit.update({
          where: { id: existing.id },
          data: { color: p.color, icon: p.icon, createdAt, archived: false },
        })
      : await prisma.habit.create({
          data: { userId: user.id, name: p.name, color: p.color, icon: p.icon, createdAt },
        });
    managed.push({ id: habit.id, createdAt: toISO(habit.createdAt), rate: p.rate, moodBoost: p.moodBoost });
  }

  // 2) Інші наявні звички користувача — теж наповнимо (профіль за замовчуванням).
  const others = await prisma.habit.findMany({
    where: { userId: user.id, archived: false, id: { notIn: managed.map((m) => m.id) } },
    select: { id: true, createdAt: true },
  });
  const allHabits: Managed[] = [
    ...managed,
    ...others.map((h) => ({ id: h.id, createdAt: toISO(h.createdAt), rate: 0.5, moodBoost: 0.2 })),
  ];

  // 3) Чистимо старі відмітки/логи (idempotent).
  await prisma.habitEntry.deleteMany({ where: { habitId: { in: allHabits.map((h) => h.id) } } });
  await prisma.dailyLog.deleteMany({ where: { userId: user.id } });

  // 4) Генеруємо відмітки.
  const entries: { habitId: string; date: string; done: boolean }[] = [];
  const startWindow = isoDaysAgo(ENTRY_WINDOW);
  for (const h of allHabits) {
    const from = h.createdAt > startWindow ? h.createdAt : startWindow;
    for (let d = from; d <= today; d = addDays(d, 1)) {
      const p = clamp(h.rate * (isWeekend(d) ? 0.82 : 1.06), 0, 0.98);
      if (Math.random() < p) entries.push({ habitId: h.id, date: d, done: true });
    }
  }
  await prisma.habitEntry.createMany({ data: entries });

  // 5) Генеруємо настрій (корельований із виконанням moodBoost-звичок).
  const doneSet = new Set(entries.map((e) => `${e.habitId}_${e.date}`));
  const logs: { userId: string; date: string; mood: number; notes: string | null }[] = [];
  for (let i = MOOD_DAYS - 1; i >= 0; i--) {
    const date = isoDaysAgo(i);
    let score = 2.7 + (Math.random() - 0.5) * 0.8;
    for (const h of allHabits) {
      if (h.createdAt > date) continue;
      const did = doneSet.has(`${h.id}_${date}`);
      score += did ? h.moodBoost : -h.moodBoost * 0.45;
    }
    const mood = clamp(Math.round(score), 1, 5);
    const notes = Math.random() < 0.15 ? NOTES[Math.floor(Math.random() * NOTES.length)] : null;
    logs.push({ userId: user.id, date, mood, notes });
  }
  await prisma.dailyLog.createMany({ data: logs });

  console.log(
    `Seeded ${TARGET_EMAIL}: ${allHabits.length} habits, ${entries.length} entries, ${logs.length} mood logs.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
