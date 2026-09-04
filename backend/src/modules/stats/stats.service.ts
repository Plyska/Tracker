import { prisma } from "../../prisma.js";

/**
 * Агрегації статистики. Обсяг даних малий → рахуємо в пам'яті по витягнутих масивах
 * (raw SQL — лише якщо виросте, docs/data-models.md).
 *
 * Інваріанти (docs/api-contract.md, data-models.md):
 * - «Активна» звичка в день D = не архівована, є хоч одна відмітка, і D >= першого треку. Вікно
 *   метрик стартує з найпершого затреканого дня (НЕ createdAt): користувач міг створити звичку
 *   наперед («завтра почну»), тож дні до першого треку не входять у `total`. Пропуски вже ПІСЛЯ
 *   старту рахуються як 0%. Звичка без жодної відмітки в метрики не входить.
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
// Синергія звичок (A→B): мін. днів, коли A виконано (в межах спільного «життя» A і B), і мін.
// помітна різниця vs базове виконання B. Слабші/малі вибірки — шум, ховаємо.
const MIN_SYNERGY_SAMPLE = 5;
const MIN_SYNERGY_DELTA = 0.15;
const TOP_SYNERGIES = 4;

export interface StatsDto {
  completionRate: number; // 0..1 за період
  currentStreak: number; // днів поспіль до «сьогодні» (= to)
  longestStreak: number; // найдовша серія за всю історію
  perfectDays: number; // днів періоду, де виконано всі активні навички
  bestHabit: { habitId: string; completionRate: number } | null;
  // Частка виконання по КОЖНІЙ звичці за період (лише активні ≥1 день). Клієнт порівнює breakdown
  // поточного й попереднього вікна → «movers» (звички, що зросли/просіли).
  habitBreakdown: {
    habitId: string;
    completionRate: number;
    activeDays: number;
    weeklyTarget: number | null; // null = щоденна; 1..6 = тижнева ціль (для підписів/гейту на клієнті)
    weeklyMinutesTarget: number | null; // null = не часова; >0 = ціль хвилин/тиждень (ADR 0011)
    totalMinutes: number; // сумарно хвилин за період (0 для бінарних)
  }[];
  moodAverage: number | null; // середній настрій за період (null = немає логів)
  moodDays: number; // скільки днів із настроєм лягло в moodAverage
  // `minutes` — сума хвилин ЧАСОВИХ навичок за день (окрема серія для тренду/час↔настрій, ADR 0011);
  // completed/total лишаються по щоденних бінарних (у часових денного очікування немає).
  daily: { date: string; completed: number; total: number; mood: number | null; minutes: number }[];
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
  // Синергія: у дні виконання A частка виконання B (`rate`) проти базової частки B (`baseline`).
  // «У дні, коли ти робиш A, ти виконуєш B на rate% (проти baseline% зазвичай)». Топ за |delta|.
  habitSynergies: {
    habitA: string; // якщо виконано A
    habitB: string; // → то B
    rate: number; // P(B виконано | A виконано), 0..1
    baseline: number; // базова частка виконання B за період, 0..1
    delta: number; // rate − baseline
    sampleDays: number; // днів, коли A виконано (вибірка)
  }[];
  // Серії по КОЖНІЙ звичці (вся історія): для «майже рекорд / новий рекорд» у віджеті досягнень.
  habitStreaks: { habitId: string; current: number; longest: number }[];
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

// ISO-дата понеділка тижня, що містить `iso` (Пн–Нд-бакет; ключ тижня для тижневих цілей).
export const mondayISO = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 0=Пн … 6=Нд
  return addDaysISO(iso, -dow);
};

/**
 * Одиниці виконання звички за період — основа unit-weighted `completionRate`. Pure (для перевірки).
 * - Щоденна (`weeklyTarget=null`): 1 одиниця/активний день; досягнуто = кількість відмічених.
 * - Тижнева: групуємо активні дні в Пн–Нд-тижні; кожен активний тиждень додає `target` до знаменника
 *   і `min(відмічено_за_тиждень, target)` до досягнутого (кап 100%/тиждень, повна ціль ЗАВЖДИ). ADR 0010.
 */
export const habitPeriodUnits = (
  activeDays: string[],
  doneDays: Set<string>,
  weeklyTarget: number | null,
): { achieved: number; targetUnits: number } => {
  if (weeklyTarget == null) {
    const done = activeDays.filter((d) => doneDays.has(d)).length;
    return { achieved: done, targetUnits: activeDays.length };
  }
  const perWeekDone = new Map<string, number>();
  const activeWeeks = new Set<string>();
  for (const d of activeDays) {
    const wk = mondayISO(d);
    activeWeeks.add(wk);
    if (doneDays.has(d)) perWeekDone.set(wk, (perWeekDone.get(wk) ?? 0) + 1);
  }
  let achieved = 0;
  let targetUnits = 0;
  for (const wk of activeWeeks) {
    targetUnits += weeklyTarget;
    achieved += Math.min(perWeekDone.get(wk) ?? 0, weeklyTarget);
  }
  return { achieved, targetUnits };
};

/**
 * Одиниці ЧАСОВОЇ навички (ADR 0011) — хвилини як одиниці, кап 100%/тиждень. Дзеркалить
 * `habitPeriodUnits` для count-цілі, але в хвилинах. `weeks` = к-сть активних Пн–Нд-тижнів
 * (вага навички у глобальному completionRate — 1 «week-goal»/тиждень, щоб хвилини не свампили count).
 */
export const habitTimedUnits = (
  activeDays: string[],
  minutesByDate: Map<string, number>,
  weeklyMinutesTarget: number,
): { achieved: number; targetUnits: number; weeks: number } => {
  const perWeekMin = new Map<string, number>();
  const activeWeeks = new Set<string>();
  for (const d of activeDays) {
    const wk = mondayISO(d);
    activeWeeks.add(wk);
    const m = minutesByDate.get(d) ?? 0;
    if (m > 0) perWeekMin.set(wk, (perWeekMin.get(wk) ?? 0) + m);
  }
  let achieved = 0;
  let targetUnits = 0;
  for (const wk of activeWeeks) {
    targetUnits += weeklyMinutesTarget;
    achieved += Math.min(perWeekMin.get(wk) ?? 0, weeklyMinutesTarget);
  }
  return { achieved, targetUnits, weeks: activeWeeks.size };
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

// ── тижневі серії (для звичок із weeklyTarget): «тижні поспіль із досягнутою ціллю» ──────────
// «Виконаний» тиждень = кількість відміток у Пн–Нд-бакеті >= target. Ключ тижня — понеділок.
export const hitWeeks = (doneDays: Set<string>, target: number): Set<string> => {
  const perWeek = new Map<string, number>();
  for (const d of doneDays) {
    const wk = mondayISO(d);
    perWeek.set(wk, (perWeek.get(wk) ?? 0) + 1);
  }
  const hits = new Set<string>();
  for (const [wk, count] of perWeek) if (count >= target) hits.add(wk);
  return hits;
};

// Тижні з досягнутою ХВИЛИННОЮ ціллю (ADR 0011): Σхвилин у Пн–Нд-бакеті >= target.
export const hitWeeksByMinutes = (
  minutesByDate: Map<string, number>,
  target: number,
): Set<string> => {
  const perWeek = new Map<string, number>();
  for (const [d, m] of minutesByDate) {
    if (m <= 0) continue;
    const wk = mondayISO(d);
    perWeek.set(wk, (perWeek.get(wk) ?? 0) + m);
  }
  const hits = new Set<string>();
  for (const [wk, sum] of perWeek) if (sum >= target) hits.add(wk);
  return hits;
};

export const longestWeekRun = (hits: Set<string>): number => {
  const sorted = [...hits].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const wk of sorted) {
    run = prev !== null && addDaysISO(prev, 7) === wk ? run + 1 : 1;
    if (run > best) best = run;
    prev = wk;
  }
  return best;
};

// Поточна тижнева серія: назад від тижня, що містить `today`. Грейс: незавершений поточний тиждень
// (ще не досяг цілі) не рве серію — стартуємо з попереднього.
export const currentWeekRun = (hits: Set<string>, today: string): number => {
  let cursor = mondayISO(today);
  if (!hits.has(cursor)) cursor = addDaysISO(cursor, -7);
  let streak = 0;
  while (hits.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -7);
  }
  return streak;
};

export async function computeStats(
  userId: string,
  from: string,
  to: string,
  habitId?: string,
): Promise<StatsDto> {
  // Scope-звички: усі активні (або одна, якщо habitId). У кошику (deletedAt != null) не входять у «активні».
  const habits = await prisma.habit.findMany({
    where: { userId, deletedAt: null, ...(habitId ? { id: habitId } : {}) },
    select: { id: true, weeklyTarget: true, weeklyMinutesTarget: true },
  });
  const habitIds = habits.map((h) => h.id);
  // Тижнева ціль по звичці: null = щоденна (метрики per-day), 1..6 = тижнева (метрики по Пн–Нд-тижнях).
  const weeklyTargetOf = new Map<string, number | null>(habits.map((h) => [h.id, h.weeklyTarget]));
  // Часова ціль (хвилини/тиждень): null = не часова, >0 = часова навичка (ADR 0011).
  const weeklyMinutesTargetOf = new Map<string, number | null>(
    habits.map((h) => [h.id, h.weeklyMinutesTarget]),
  );
  const timedHabitIds = habitIds.filter((id) => weeklyMinutesTargetOf.get(id) != null);
  // Щоденні бінарні звички — для денних метрик (daily[]/perfectDays); у тижневих і ЧАСОВИХ денного
  // очікування немає (обидва — тижневі за природою, тож поза денним total).
  const dailyHabitIds = habitIds.filter(
    (id) => weeklyTargetOf.get(id) == null && weeklyMinutesTargetOf.get(id) == null,
  );

  // Усі відмітки scope-звичок (для streak — по всій історії; період фільтруємо в пам'яті).
  const entries = habitIds.length
    ? await prisma.habitEntry.findMany({
        where: { habitId: { in: habitIds }, done: true },
        select: { habitId: true, date: true, minutes: true },
      })
    : [];

  // Денні логи настрою за період.
  const logs = await prisma.dailyLog.findMany({
    where: { userId, date: { gte: from, lte: to } },
    select: { date: true, mood: true },
  });
  const moodByDate = new Map(logs.map((l) => [l.date, l.mood]));

  // done[habitId] = Set дат, коли виконано (вся історія). minutesByHabit[habitId] = дата→хвилини (часові).
  const doneByHabit = new Map<string, Set<string>>(habitIds.map((id) => [id, new Set()]));
  const minutesByHabit = new Map<string, Map<string, number>>(habitIds.map((id) => [id, new Map()]));
  for (const e of entries) {
    doneByHabit.get(e.habitId)!.add(e.date);
    if (e.minutes != null) minutesByHabit.get(e.habitId)!.set(e.date, e.minutes);
  }

  // День «старту» звички = найперша відмітка (не createdAt): користувач може створити звичку
  // наперед («завтра почну»), тож до першого треку днів у total нема. Без жодної відмітки звичка
  // взагалі не активна (в total не входить — не розводить completionRate доки не почато).
  const firstEntryISO = new Map<string, string | undefined>(
    habitIds.map((id) => {
      let earliest: string | undefined;
      for (const d of doneByHabit.get(id)!) if (earliest === undefined || d < earliest) earliest = d;
      return [id, earliest];
    }),
  );

  // Активна звичка в день D: є перший трек і D >= нього (пропуски після старту = чесний 0%).
  const isActive = (id: string, day: string): boolean => {
    const since = firstEntryISO.get(id);
    return since !== undefined && since <= day;
  };

  // ── daily[] + perfect days (за період; ЛИШЕ щоденні звички) ───────────────────────────
  // Тижневі звички не мають денного очікування → не входять у денний `total`/`perfectDays`
  // (інакше 4 «пропуски» на тиждень тягнули б ratio вниз, а «ідеальний день» був би недосяжний).
  const period = enumerateDates(from, to);
  const daily = period.map((date) => {
    const activeIds = dailyHabitIds.filter((id) => isActive(id, date));
    const completed = activeIds.filter((id) => doneByHabit.get(id)!.has(date)).length;
    // Хвилини за день = сума по всіх ЧАСОВИХ навичках (окрема серія, не змішується з completion).
    let minutes = 0;
    for (const id of timedHabitIds) minutes += minutesByHabit.get(id)!.get(date) ?? 0;
    return { date, completed, total: activeIds.length, mood: moodByDate.get(date) ?? null, minutes };
  });
  const perfectDays = daily.filter((d) => d.total > 0 && d.completed === d.total).length;

  // ── streak-метрики (вся історія; «активний» день = ≥1 виконана scope-звичка) ──────────
  const activeDays = new Set<string>();
  for (const set of doneByHabit.values()) for (const d of set) activeDays.add(d);
  const currentStreak = currentRun(activeDays, to);
  const longestStreak = longestRun(activeDays);

  // ── per-habit breakdown + bestHabit + глобальний completionRate (за період) ────────────
  // Модель «одиниць виконання» (unit-weighted): щоденна звичка = 1 одиниця/активний день; тижнева =
  // `target` одиниць/Пн–Нд-тиждень, досягнуто = Σ min(відмічено_за_тиждень, target) (кап 100%/тиждень,
  // знаменник = повна ціль ЗАВЖДИ — і стартовий, і поточний тиждень). Глобальний completionRate =
  // Σ досягнуто / Σ ціль по всіх звичках → для чисто-щоденних юзерів тотожний старій формулі. Див. ADR 0010.
  const habitBreakdown: StatsDto["habitBreakdown"] = [];
  let bestHabit: StatsDto["bestHabit"] = null;
  let totalAchieved = 0;
  let totalTarget = 0;
  // Сира денна частота (doneDays/activeDays) — baseline для синергії (НЕ weekly-capped rate).
  const dayFreq = new Map<string, number>();
  for (const id of habitIds) {
    const activeInPeriod = period.filter((d) => isActive(id, d));
    if (!activeInPeriod.length) continue;
    const done = doneByHabit.get(id)!;
    const doneInPeriod = activeInPeriod.filter((d) => done.has(d)).length;
    dayFreq.set(id, doneInPeriod / activeInPeriod.length);

    const wt = weeklyTargetOf.get(id) ?? null;
    const wmt = weeklyMinutesTargetOf.get(id) ?? null;
    const mins = minutesByHabit.get(id)!;
    const totalMinutes = activeInPeriod.reduce((s, d) => s + (mins.get(d) ?? 0), 0);

    // rate — частка виконання 0..1 (для breakdown/bestHabit); weight — вага у глобальному
    // completionRate у count-сумірних одиницях: щоденна = дні, count = target/тиждень, часова = 1/тиждень
    // (щоб хвилини не свампили count). Для не-часових rate*weight === achieved → тотожно старій формулі.
    let rate: number;
    let weight: number;
    if (wmt != null) {
      const timed = habitTimedUnits(activeInPeriod, mins, wmt);
      rate = timed.targetUnits ? timed.achieved / timed.targetUnits : 0;
      weight = timed.weeks;
    } else {
      const { achieved, targetUnits } = habitPeriodUnits(activeInPeriod, done, wt);
      rate = targetUnits ? achieved / targetUnits : 0;
      weight = targetUnits;
    }
    totalAchieved += rate * weight;
    totalTarget += weight;
    habitBreakdown.push({
      habitId: id,
      completionRate: rate,
      activeDays: activeInPeriod.length,
      weeklyTarget: wt,
      weeklyMinutesTarget: wmt,
      totalMinutes,
    });
    if (!bestHabit || rate > bestHabit.completionRate) bestHabit = { habitId: id, completionRate: rate };
  }
  const completionRate = totalTarget ? totalAchieved / totalTarget : 0;

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

  // ── синергія звичок A→B (за період; гейт вибірки й помітної різниці) ───────────────────
  // Потрібно ≥2 звички; для одиночного перегляду (habitId) не рахуємо. baseline B — СИРА денна
  // частота (dayFreq), а не weekly-capped completionRate: rate = P(B|A) теж денний, одиниці мусять збігатись.
  const periodRate = dayFreq;
  const habitSynergies: StatsDto["habitSynergies"] = [];
  if (!habitId && habitIds.length >= 2) {
    for (const a of habitIds) {
      for (const b of habitIds) {
        if (a === b) continue;
        const baseline = periodRate.get(b);
        if (baseline === undefined) continue; // B не активна в періоді
        const common = period.filter((d) => isActive(a, d) && isActive(b, d));
        const aDone = common.filter((d) => doneByHabit.get(a)!.has(d));
        if (aDone.length < MIN_SYNERGY_SAMPLE) continue;
        const bGivenA = aDone.filter((d) => doneByHabit.get(b)!.has(d)).length;
        const rate = bGivenA / aDone.length;
        const delta = rate - baseline;
        if (Math.abs(delta) < MIN_SYNERGY_DELTA) continue;
        habitSynergies.push({ habitA: a, habitB: b, rate, baseline, delta, sampleDays: aDone.length });
      }
    }
    habitSynergies.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  }

  // ── серії по кожній звичці (вся історія) ──────────────────────────────────────────────
  // Щоденна звичка → дні поспіль; тижнева → тижні поспіль із досягнутою ціллю (одиницю «днів/тижнів»
  // підписує клієнт за weeklyTarget).
  const habitStreaks: StatsDto["habitStreaks"] = habitIds.map((id) => {
    const done = doneByHabit.get(id)!;
    const wt = weeklyTargetOf.get(id) ?? null;
    const wmt = weeklyMinutesTargetOf.get(id) ?? null;
    // Часова → тижні поспіль із досягнутою хвилинною ціллю (Σхвилин ≥ target).
    if (wmt != null) {
      const hits = hitWeeksByMinutes(minutesByHabit.get(id)!, wmt);
      return { habitId: id, current: currentWeekRun(hits, to), longest: longestWeekRun(hits) };
    }
    if (wt == null) return { habitId: id, current: currentRun(done, to), longest: longestRun(done) };
    const hits = hitWeeks(done, wt);
    return { habitId: id, current: currentWeekRun(hits, to), longest: longestWeekRun(hits) };
  });

  return {
    completionRate,
    currentStreak,
    longestStreak,
    perfectDays,
    bestHabit,
    habitBreakdown,
    habitSynergies: habitSynergies.slice(0, TOP_SYNERGIES),
    habitStreaks,
    moodAverage,
    moodDays: logs.length,
    daily,
    moodCorrelations: moodCorrelations
      .filter((c) => Math.abs(c.delta) >= MIN_CORRELATION_DELTA)
      .slice(0, TOP_CORRELATIONS),
    moodVsCompletion,
  };
}
