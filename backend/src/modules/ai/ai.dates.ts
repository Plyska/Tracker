/**
 * Дати для AI-модуля: ISO `YYYY-MM-DD`, арифметика в UTC.
 *
 * Чому окремий файл: ці ж чотири хелпери встигли розійтися по `ai.context`, `ai.insights` і
 * `ai.checkin` копіями. Копії дат — класичне джерело розбіжності на межі тижня, а весь модуль
 * тримається на тому, що «поточний Пн–Нд» скрізь означає одне й те саме.
 *
 * Чому UTC, а не локальна TZ сервера: «сьогодні» приходить від КЛІЄНТА (його локальна дата), і
 * ми лише зсуваємо цю строку на дні. Будь-яка серверна TZ тут тільки внесла б дрейф.
 */

const toISO = (d: Date): string => d.toISOString().slice(0, 10);

const parts = (iso: string): [number, number, number] =>
  iso.split("-").map(Number) as [number, number, number];

/** Зсув на `n` днів (може бути відʼємним). */
export const addDaysISO = (iso: string, n: number): string => {
  const [y, m, d] = parts(iso);
  return toISO(new Date(Date.UTC(y, m - 1, d + n)));
};

/** День тижня, де 0 = понеділок (ADR: тиждень Пн–Нд). */
export const dowMon0 = (iso: string): number => {
  const [y, m, d] = parts(iso);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
};

/** Понеділок тижня, що містить `iso`. */
export const mondayISO = (iso: string): string => addDaysISO(iso, -dowMon0(iso));

/** Скільки днів між двома датами (`to - from`). */
export const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export const isISODate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * Ключ періоду → його межі. Обернена до `isoWeekKey`/`from.slice(0,7)` з `ai.context.ts`.
 *
 * Потрібна для архіву листів: у БД лежить лише `periodKey` («2026-W36»), а показати людині треба
 * дні. Рахуємо на сервері й тут, поруч з усією іншою датною арифметикою — саме щоб клієнт не
 * заводив власну копію правил ISO-тижня (див. шапку файлу: копії дат розходяться на межі року).
 *
 * ISO-тиждень 1 — той, що містить 4 січня; звідси й відлік.
 */
export function periodKeyBounds(key: string): { from: string; to: string } {
  const week = /^(\d{4})-W(\d{2})$/.exec(key);
  if (week) {
    const [, year, num] = week;
    const jan4 = `${year}-01-04`;
    const firstMonday = mondayISO(jan4);
    const from = addDaysISO(firstMonday, (Number(num) - 1) * 7);
    return { from, to: addDaysISO(from, 6) };
  }
  // Місяць: «2026-09» → перше й останнє число.
  const from = `${key}-01`;
  const [y, m] = parts(from);
  return { from, to: toISO(new Date(Date.UTC(y, m, 0))) };
}
