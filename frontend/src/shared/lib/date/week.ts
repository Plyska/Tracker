import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isSameDay,
  isWeekend as isWeekendFns,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { enUS, uk } from "date-fns/locale";
import type { Locale } from "date-fns";

/** date-fns локаль за кодом i18n (для назв днів/місяців). */
const DATE_FNS_LOCALES: Record<string, Locale> = { en: enUS, uk };

export function getDateFnsLocale(code: string): Locale {
  return DATE_FNS_LOCALES[code] ?? enUS;
}

/** Дата → ISO 'YYYY-MM-DD' (без часу/таймзони — формат зберігання, §6). */
export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Унікальний ключ клітинки таблиці. */
export function entryKey(habitId: string, date: string): string {
  return `${habitId}_${date}`;
}

/** 7 днів тижня (Пн→Нд), що містить `anchor`. */
export function getWeekDays(anchor: Date): Date[] {
  const monday = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Усі календарні дні місяця (1 → останній), що містить `anchor`. */
export function getMonthDays(anchor: Date): Date[] {
  return eachDayOfInterval({
    start: startOfMonth(anchor),
    end: endOfMonth(anchor),
  });
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/** Вихідний (сб/нд) — для приглушеної підсвітки заголовків днів у таблиці. */
export function isWeekend(date: Date): boolean {
  return isWeekendFns(date);
}

/** Майбутній день (після сьогодні) — такі клітинки в таблиці заблоковані. */
export function isFutureDay(date: Date): boolean {
  return isAfter(startOfDay(date), startOfDay(new Date()));
}

/** ISO 'YYYY-MM-DD' → Date (локальна, опівночі). Зворотне до `toISODate`. */
export function fromISODate(iso: string): Date {
  return parseISO(iso);
}

/** Сьогоднішня дата як ISO 'YYYY-MM-DD' (опорна точка для «Today»). */
export function todayISODate(): string {
  return toISODate(new Date());
}

/**
 * Зсув опорної дати на один період у напрямку `dir` (-1 назад / +1 вперед).
 * `week` → ±7 днів, `month` → ±1 календарний місяць. Повертає ISO 'YYYY-MM-DD'.
 */
export function shiftAnchor(
  anchorISO: string,
  scale: "week" | "month",
  dir: -1 | 1,
): string {
  const date = parseISO(anchorISO);
  const next = scale === "week" ? addWeeks(date, dir) : addMonths(date, dir);
  return toISODate(next);
}
