import { addDays, format, getDay, parseISO } from "date-fns";
import type { DailyStat } from "@/entities/stats";
import { getDateFnsLocale } from "@/shared/lib";

export interface WeekdayCell {
  weekday: number; // 0..6 (0 = неділя, як date-fns getDay)
  name: string; // повна локалізована назва (з великої)
  short: string; // коротка локалізована назва (з великої)
  completion: number | null; // 0..1 середня частка виконання (null = не було активних днів)
  mood: number | null; // середній настрій 1..5 (null = немає логів)
  days: number; // днів цього дня тижня з total>0
  isBest: boolean; // найвища частка виконання (серед тих, що пройшли гейт)
  isWorst: boolean; // найнижча
}

export interface WeekdayInsight {
  cells: WeekdayCell[]; // Пн..Нд — завжди 7 елементів (для бар-чарту)
  /** Досить даних і є варіація для виділення найкращого/найгіршого дня виконання. */
  hasCompletion: boolean;
  bestMood: { name: string; mood: number } | null;
  worstMood: { name: string; mood: number } | null;
}

// Мін. входжень дня тижня в періоді, щоб день брав участь у best/worst (інакше шум).
const MIN_OCCURRENCES = 2;
// Порядок відображення: Пн..Нд (індекси date-fns getDay, де 0 = Нд).
const ORDER = [1, 2, 3, 4, 5, 6, 0];
// Референсна неділя (getDay=0) — для локалізованих назв днів без прив'язки до фактичних дат.
const REF_SUNDAY = parseISO("2023-01-01");

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Розклад по днях тижня за період: середня частка виконання (Σcompleted/Σtotal) і середній
 * настрій для кожного дня. Найкращий/найгірший день виконання виділяємо лише за гейтом
 * (≥2 входження, ≥2 дні з варіацією). Мудрий/настрій — окремо (потрібні логи настрою).
 * `null`, якщо взагалі немає даних (порожній період).
 */
export function weekdayInsights(
  daily: DailyStat[],
  language: string,
): WeekdayInsight | null {
  const locale = getDateFnsLocale(language);

  const buckets = new Map<
    number,
    { completed: number; total: number; days: number; moodSum: number; moodDays: number }
  >();
  for (const d of daily) {
    const wd = getDay(parseISO(d.date));
    const b =
      buckets.get(wd) ??
      { completed: 0, total: 0, days: 0, moodSum: 0, moodDays: 0 };
    if (d.total > 0) {
      b.completed += d.completed;
      b.total += d.total;
      b.days += 1;
    }
    if (d.mood != null) {
      b.moodSum += d.mood;
      b.moodDays += 1;
    }
    buckets.set(wd, b);
  }
  if (buckets.size === 0) return null;

  const nameOf = (wd: number) => cap(format(addDays(REF_SUNDAY, wd), "EEEE", { locale }));
  const shortOf = (wd: number) => cap(format(addDays(REF_SUNDAY, wd), "EEEEEE", { locale }));

  // Найкращий/найгірший день виконання (за гейтом + варіацією).
  const rated = [...buckets.entries()]
    .filter(([, b]) => b.days >= MIN_OCCURRENCES && b.total > 0)
    .map(([wd, b]) => ({ wd, ratio: b.completed / b.total }))
    .sort((a, b) => b.ratio - a.ratio);
  let bestWd: number | null = null;
  let worstWd: number | null = null;
  const hasCompletion =
    rated.length >= 2 && rated[0].ratio !== rated[rated.length - 1].ratio;
  if (hasCompletion) {
    bestWd = rated[0].wd;
    worstWd = rated[rated.length - 1].wd;
  }

  const cells: WeekdayCell[] = ORDER.map((wd) => {
    const b = buckets.get(wd);
    return {
      weekday: wd,
      name: nameOf(wd),
      short: shortOf(wd),
      completion: b && b.total > 0 ? b.completed / b.total : null,
      mood: b && b.moodDays > 0 ? b.moodSum / b.moodDays : null,
      days: b?.days ?? 0,
      isBest: wd === bestWd,
      isWorst: wd === worstWd,
    };
  });

  // Найкращий/найгірший день за настроєм (за тим же гейтом + варіацією).
  const moodRated = [...buckets.entries()]
    .filter(([, b]) => b.moodDays >= MIN_OCCURRENCES)
    .map(([wd, b]) => ({ wd, mood: b.moodSum / b.moodDays }))
    .sort((a, b) => b.mood - a.mood);
  let bestMood: WeekdayInsight["bestMood"] = null;
  let worstMood: WeekdayInsight["worstMood"] = null;
  if (moodRated.length >= 2 && moodRated[0].mood !== moodRated[moodRated.length - 1].mood) {
    bestMood = { name: nameOf(moodRated[0].wd), mood: moodRated[0].mood };
    worstMood = {
      name: nameOf(moodRated[moodRated.length - 1].wd),
      mood: moodRated[moodRated.length - 1].mood,
    };
  }

  return { cells, hasCompletion, bestMood, worstMood };
}
