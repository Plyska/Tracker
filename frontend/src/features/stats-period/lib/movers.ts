import type { Habit } from "@/entities/habit";
import type { Stats } from "@/entities/stats";

/** Звичка, що помітно зросла/просіла vs попередній період. */
export interface HabitMover {
  habitId: string;
  name: string;
  delta: number; // current.rate − prev.rate (частки, 0..1)
  current: number; // частка виконання зараз (0..1)
}

export interface Movers {
  improved: HabitMover[];
  declined: HabitMover[];
}

// Гейти проти шуму: досить активних днів у ОБОХ вікнах + помітна зміна.
const MIN_ACTIVE_DAYS = 3;
const MIN_DELTA = 0.1; // 10 в.п.
const TOP = 3;

/**
 * Порівняння частки виконання по кожній звичці: current.habitBreakdown vs prev.habitBreakdown.
 * Лишаємо лише звички з достатньою вибіркою в обох вікнах і помітною зміною; топ-N у кожен бік.
 */
export function buildMovers(
  current: Stats,
  prev: Stats | undefined,
  habits: Habit[],
): Movers {
  if (!prev) return { improved: [], declined: [] };

  const prevById = new Map(prev.habitBreakdown.map((h) => [h.habitId, h]));
  const nameById = new Map(habits.map((h) => [h.id, h.name]));

  const movers: HabitMover[] = [];
  for (const cur of current.habitBreakdown) {
    const before = prevById.get(cur.habitId);
    if (!before) continue; // немає в попередньому вікні (нова звичка) → не рухомець
    if (cur.activeDays < MIN_ACTIVE_DAYS || before.activeDays < MIN_ACTIVE_DAYS) continue;
    const delta = cur.completionRate - before.completionRate;
    if (Math.abs(delta) < MIN_DELTA) continue;
    movers.push({
      habitId: cur.habitId,
      name: nameById.get(cur.habitId) ?? "—",
      delta,
      current: cur.completionRate,
    });
  }

  const improved = movers
    .filter((m) => m.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, TOP);
  const declined = movers
    .filter((m) => m.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, TOP);

  return { improved, declined };
}
