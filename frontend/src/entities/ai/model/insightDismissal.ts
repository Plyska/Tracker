/**
 * Приховування підказок-патернів (план §3.4, «частотні капи»).
 *
 * Зберігаємо **per-device** у localStorage: це UI-шум, а не дані акаунта — синхронізувати між
 * пристроями нема сенсу, а серверний стан на таке був би надмірним.
 *
 * Формат — один ключ із мапою `{ [insightKey]: "YYYY-MM-DD" }` = «приховано ДО цієї дати
 * (не включно)». Одна мапа замість N ключів: легко перевірити «чи є приховані» і легко скинути все.
 *
 * Свідоме рішення: кулдаун ставимо ЛИШЕ на явне приховування. «Сліпого» авто-ховання після
 * першого показу не робимо — це могло б сховати живий сигнал `care` («3 дні низький настрій»)
 * саме тоді, коли він доречний. Від відчуття шаблонності захищає інше: ротація формулювань
 * (3 варіанти на тригер, змінюються щодня) + максимум одна картка на екрані.
 */

const STORAGE_KEY = "ai-insights-hidden";

/** Скільки днів підказка лишається прихованою після кліку на «×». */
export const INSIGHT_COOLDOWN_DAYS = 3;

type HiddenMap = Record<string, string>;

const addDaysISO = (iso: string, n: number): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/** Читання завжди безпечне: приватний режим / заблоковане сховище → просто «нічого не приховано». */
function read(): HiddenMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as HiddenMap) : {};
  } catch {
    return {};
  }
}

function write(map: HiddenMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* сховище недоступне — приховування просто не переживе перезавантаження */
  }
}

/** Прибрати протерміновані записи, щоб мапа не росла вічно. */
function prune(map: HiddenMap, today: string): HiddenMap {
  return Object.fromEntries(Object.entries(map).filter(([, until]) => until > today));
}

export function isInsightHidden(key: string, today: string): boolean {
  const until = read()[key];
  return until !== undefined && until > today;
}

/** Приховати підказку на `INSIGHT_COOLDOWN_DAYS` днів. */
export function hideInsight(key: string, today: string): void {
  const map = prune(read(), today);
  map[key] = addDaysISO(today, INSIGHT_COOLDOWN_DAYS);
  write(map);
}

/** Скасувати приховування конкретної підказки (undo). */
export function unhideInsight(key: string, today: string): void {
  const map = prune(read(), today);
  delete map[key];
  write(map);
}

/** Чи є взагалі приховані підказки — щоб не показувати кнопку «Показати приховані» дарма. */
export function hasHiddenInsights(today: string): boolean {
  return Object.keys(prune(read(), today)).length > 0;
}

/** Повернути всі приховані підказки. */
export function restoreAllInsights(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* нічого не робимо */
  }
}
