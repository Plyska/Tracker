import { format, getDay, parseISO } from "date-fns";
import type { DailyStat } from "@/entities/stats";
import { getDateFnsLocale } from "@/shared/lib";

export interface WeekdayStat {
  weekday: number; // 0..6 (0 = неділя, як date-fns getDay)
  name: string; // локалізована повна назва (з великої літери)
  ratio: number; // 0..1 — середня частка виконання в цей день тижня
  days: number; // скільки таких днів у періоді враховано
}

export interface WeekdayInsight {
  best: WeekdayStat;
  worst: WeekdayStat;
}

// Мін. входжень дня тижня в періоді, щоб день брав участь (інакше один день = шум).
const MIN_OCCURRENCES = 2;

/**
 * Найкращий/найгірший день тижня за середньою часткою виконання (Σcompleted/Σtotal по днях
 * цього дня тижня). Гейт: ≥2 входження і total>0; потрібно ≥2 дні тижня з різними частками —
 * інакше `null` (замало даних / немає варіації). Назва дня — локалізована з фактичної дати вибірки.
 */
export function bestWorstWeekday(
  daily: DailyStat[],
  language: string,
): WeekdayInsight | null {
  const locale = getDateFnsLocale(language);

  const buckets = new Map<
    number,
    { completed: number; total: number; days: number; sample: string }
  >();
  for (const d of daily) {
    if (d.total <= 0) continue;
    const wd = getDay(parseISO(d.date));
    const b = buckets.get(wd) ?? {
      completed: 0,
      total: 0,
      days: 0,
      sample: d.date,
    };
    b.completed += d.completed;
    b.total += d.total;
    b.days += 1;
    buckets.set(wd, b);
  }

  const stats: WeekdayStat[] = [];
  for (const [wd, b] of buckets) {
    if (b.days < MIN_OCCURRENCES || b.total <= 0) continue;
    const raw = format(parseISO(b.sample), "EEEE", { locale });
    stats.push({
      weekday: wd,
      name: raw.charAt(0).toUpperCase() + raw.slice(1),
      ratio: b.completed / b.total,
      days: b.days,
    });
  }

  if (stats.length < 2) return null;

  const sorted = [...stats].sort((a, b) => b.ratio - a.ratio);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  if (best.ratio === worst.ratio) return null; // немає варіації → не інсайт

  return { best, worst };
}
