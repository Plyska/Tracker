import {
  addDays,
  format,
  isAfter,
  isSameDay,
  startOfDay,
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

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/** Майбутній день (після сьогодні) — такі клітинки в таблиці заблоковані. */
export function isFutureDay(date: Date): boolean {
  return isAfter(startOfDay(date), startOfDay(new Date()));
}
