import { prisma } from "../../prisma.js";

/**
 * Агрегації статистики. Обсяг даних малий → рахуємо в пам'яті по витягнутих масивах
 * (raw SQL — лише якщо виросте, docs/data-models.md).
 *
 * Інваріанти (docs/api-contract.md, data-models.md):
 * - «Активна» звичка в день D = не архівована і `createdAt <= D` (майбутні дні / дні до створення
 *   не входять у `total`, інакше completionRate бреше для пізно доданих звичок).
 * - Streak-метрики — це «now»-факти: рахуються по ВСІЙ історії (не по вибраному періоді),
 *   а «сьогодні» = `to` (локальна дата клієнта; так уникаємо TZ-дрейфу від серверного UTC).
 * - Mood-кореляція — лише по днях із оцінкою настрою і в межах життя звички; за гейтом
 *   мінімальної вибірки (≥ MIN_MOOD_SAMPLE у ОБОХ групах), формулювання «пов'язано з».
 */

const MIN_MOOD_SAMPLE = 5;
const TOP_CORRELATIONS = 3;
// Мін. помітна різниця настрою (бали), щоб показувати кореляцію. Слабші (|delta| < 0.3) — шум,
// ховаємо: показ адаптується під дані (0–TOP_CORRELATIONS), а не доповнюється «майже нулями».
const MIN_CORRELATION_DELTA = 0.3;
// Мін. днів із настроєм (і total>0) для метрики «виконання ↔ настрій»: медіанний спліт навпіл
// дає по ≥5 у кожній половині.
const MIN_SPLIT_DAYS = 10;

export interface StatsDto {
  completionRate: number; // 0..1 за період
  currentStreak: number; // днів поспіль до «сьогодні» (= to)
  longestStreak: number; // найдовша серія за всю історію
  perfectDays: number; // днів періоду, де виконано всі активні навички
  bestHabit: { habitId: string; completionRate: number } | null;
  // Частка виконання по КОЖНІЙ звичці за період (лише активні ≥1 день). Клієнт порівнює breakdown
  // поточного й попереднього вікна → «movers» (звички, що зросли/просіли).
  habitBreakdown: { habitId: string; completionRate: number; activeDays: number }[];
  moodAverage: number | null; // середній настрій за період (null = немає логів)
  moodDays: number; // скільки днів із настроєм лягло в moodAverage
  daily: { date: string; completed: number; total: number; mood: number | null }[];
  moodCorrelations: {
    habitId: string;
    moodWith: number; // середній настрій у дні, коли звичку виконано
    moodWithout: number; // … коли НЕ виконано
    delta: number; // moodWith − moodWithout
    sampleWith: number;
    sampleWithout: number;
  }[];
  // Звʼязок «продуктивність дня ↔ настрій»: середній настрій у дні з вищою vs нижчою ЧАСТКОЮ
  // виконання (completed/total, медіанний спліт). Частка — щоб метрика не ламалася при зміні
  // кількості звичок (додав/видалив/архівував). null = недостатньо залогованих днів.
  moodVsCompletion: {
    delta: number; // highAvg − lowAvg (бали настрою)
    lowAvg: number; // сер. настрій у нижній половині за часткою виконання
    highAvg: number; // … у верхній половині
    sampleDays: number; // скільки днів (із настроєм і total>0) використано
  } | null;
}

// ── date-хелпери (рядкові ISO 'YYYY-MM-DD'; лексикографічно == хронологічно) ──────────────

const toISO = (d: Date): string => d.toISOString().slice(0, 10);

const addDaysISO = (iso: string, n: number): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return toISO(new Date(Date.UTC(y, m - 1, d + n)));
};

const enumerateDates = (from: string, to: string): string[] => {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDaysISO(d, 1)) out.push(d);
  return out;
};

const avg = (xs: number[]): number =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

// Найдовша серія послідовних активних днів у наборі (рядки ISO-дат).
const longestRun = (activeDays: Set<string>): number => {
  const sorted = [...activeDays].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    run = prev !== null && addDaysISO(prev, 1) === day ? run + 1 : 1;
    if (run > best) best = run;
    prev = day;
  }
  return best;
};

// Поточна серія: рахуємо назад від `today` (= to). Грейс на сьогодні (якщо ще не відмічено —
// серія не рветься, стартуємо з учора).
const currentRun = (activeDays: Set<string>, today: string): number => {
  let cursor = activeDays.has(today) ? today : addDaysISO(today, -1);
  let streak = 0;
  while (activeDays.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
};

export async function computeStats(
  userId: string,
  from: string,
  to: string,
  habitId?: string,
): Promise<StatsDto> {
  // Scope-звички: усі неархівовані (або одна, якщо habitId). Архівовані не входять у «активні».
  const habits = await prisma.habit.findMany({
    where: { userId, archived: false, ...(habitId ? { id: habitId } : {}) },
    select: { id: true, createdAt: true },
  });
  const habitIds = habits.map((h) => h.id);
  const createdISO = new Map(habitIds.map((id, i) => [id, toISO(habits[i].createdAt)]));

  // Усі відмітки scope-звичок (для streak — по всій історії; період фільтруємо в пам'яті).
  const entries = habitIds.length
    ? await prisma.habitEntry.findMany({
        where: { habitId: { in: habitIds }, done: true },
        select: { habitId: true, date: true },
      })
    : [];

  // Денні логи настрою за період.
  const logs = await prisma.dailyLog.findMany({
    where: { userId, date: { gte: from, lte: to } },
    select: { date: true, mood: true },
  });
  const moodByDate = new Map(logs.map((l) => [l.date, l.mood]));

  // done[habitId] = Set дат, коли виконано (вся історія).
  const doneByHabit = new Map<string, Set<string>>(habitIds.map((id) => [id, new Set()]));
  for (const e of entries) doneByHabit.get(e.habitId)!.add(e.date);

  // Активна звичка в день D: createdAt <= D.
  const isActive = (id: string, day: string): boolean => createdISO.get(id)! <= day;

  // ── daily[] + completion / perfect days (за період) ──────────────────────────────────
  const period = enumerateDates(from, to);
  const daily = period.map((date) => {
    const activeIds = habitIds.filter((id) => isActive(id, date));
    const completed = activeIds.filter((id) => doneByHabit.get(id)!.has(date)).length;
    return { date, completed, total: activeIds.length, mood: moodByDate.get(date) ?? null };
  });

  const sumCompleted = daily.reduce((a, d) => a + d.completed, 0);
  const sumTotal = daily.reduce((a, d) => a + d.total, 0);
  const completionRate = sumTotal ? sumCompleted / sumTotal : 0;
  const perfectDays = daily.filter((d) => d.total > 0 && d.completed === d.total).length;

  // ── streak-метрики (вся історія; «активний» день = ≥1 виконана scope-звичка) ──────────
  const activeDays = new Set<string>();
  for (const set of doneByHabit.values()) for (const d of set) activeDays.add(d);
  const currentStreak = currentRun(activeDays, to);
  const longestStreak = longestRun(activeDays);

  // ── per-habit breakdown + bestHabit (за період): % виконання серед активних днів ──────
  const habitBreakdown: StatsDto["habitBreakdown"] = [];
  let bestHabit: StatsDto["bestHabit"] = null;
  for (const id of habitIds) {
    const activeInPeriod = period.filter((d) => isActive(id, d));
    if (!activeInPeriod.length) continue;
    const doneInPeriod = activeInPeriod.filter((d) => doneByHabit.get(id)!.has(d)).length;
    const rate = doneInPeriod / activeInPeriod.length;
    habitBreakdown.push({ habitId: id, completionRate: rate, activeDays: activeInPeriod.length });
    if (!bestHabit || rate > bestHabit.completionRate) bestHabit = { habitId: id, completionRate: rate };
  }

  // ── moodAverage (за період) ───────────────────────────────────────────────────────────
  const moodAverage = logs.length ? avg(logs.map((l) => l.mood)) : null;

  // ── mood-кореляція (за період; гейт ≥ MIN_MOOD_SAMPLE у обох групах) ───────────────────
  const moodedDays = period.filter((d) => moodByDate.has(d));
  const moodCorrelations: StatsDto["moodCorrelations"] = [];
  for (const id of habitIds) {
    const withMood: number[] = [];
    const withoutMood: number[] = [];
    for (const d of moodedDays) {
      if (!isActive(id, d)) continue; // лише в межах життя звички
      (doneByHabit.get(id)!.has(d) ? withMood : withoutMood).push(moodByDate.get(d)!);
    }
    if (withMood.length < MIN_MOOD_SAMPLE || withoutMood.length < MIN_MOOD_SAMPLE) continue;
    const moodWith = avg(withMood);
    const moodWithout = avg(withoutMood);
    moodCorrelations.push({
      habitId: id,
      moodWith,
      moodWithout,
      delta: moodWith - moodWithout,
      sampleWith: withMood.length,
      sampleWithout: withoutMood.length,
    });
  }
  moodCorrelations.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  // ── «продуктивність ↔ настрій» (медіанний спліт по ЧАСТЦІ виконання, дні з настроєм і total>0) ──
  // Частка (completed/total), а не абсолютна кількість: інакше додавання/видалення звичок зсувало б
  // поріг і плодило хибні кореляції (ранні дні з малою к-стю звичок завжди падали б у «низьку» групу).
  const moodedCompletion = daily
    .filter((d) => d.mood != null && d.total > 0)
    .map((d) => ({ ratio: d.completed / d.total, mood: d.mood as number }));
  let moodVsCompletion: StatsDto["moodVsCompletion"] = null;
  if (moodedCompletion.length >= MIN_SPLIT_DAYS) {
    const sorted = [...moodedCompletion].sort((a, b) => a.ratio - b.ratio);
    const half = Math.floor(sorted.length / 2);
    const lowAvg = avg(sorted.slice(0, half).map((x) => x.mood));
    const highAvg = avg(sorted.slice(sorted.length - half).map((x) => x.mood));
    moodVsCompletion = {
      delta: highAvg - lowAvg,
      lowAvg,
      highAvg,
      sampleDays: moodedCompletion.length,
    };
  }

  return {
    completionRate,
    currentStreak,
    longestStreak,
    perfectDays,
    bestHabit,
    habitBreakdown,
    moodAverage,
    moodDays: logs.length,
    daily,
    moodCorrelations: moodCorrelations
      .filter((c) => Math.abs(c.delta) >= MIN_CORRELATION_DELTA)
      .slice(0, TOP_CORRELATIONS),
    moodVsCompletion,
  };
}
