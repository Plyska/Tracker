/**
 * Форматування тривалості (хвилини) для часових навичок (ADR 0011). Компактно для клітинок таблиці
 * і людяно для карток статистики. Локаль-нейтральне (год/хв суфікси — з i18n на місці виклику, коли
 * потрібно; тут — короткі універсальні «h»/«m»). Робота лише з цілими хвилинами.
 */

/** Компактний підпис клітинки: 45 → "45m", 60 → "1h", 90 → "1h30", 150 → "2h30". 0/none → "". */
export const formatCellDuration = (minutes: number): string => {
  if (minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
};

/** Години з бекенд-хвилин для підписів (ціль/сумарно): 300 → "5", 330 → "5.5", 90 → "1.5". */
export const minutesToHoursLabel = (minutes: number): string => {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
};

export const hoursToMinutes = (hours: number): number => Math.round(hours * 60);
