import type { CheckinActionDto } from "@/shared/api";

/**
 * Підготовка дій чек-іну до запису (ADR 0012, фаза B1).
 *
 * Записуємо ТИМИ САМИМИ мутаціями, що й ручні дії, — модель нічого не пише сама. Через це
 * доводиться поважати їхню семантику, а вона тут неочевидна:
 *  - `PUT /daily-logs` **замінює** `notes` і **вимагає** `mood`. Тож настрій і запис у щоденник
 *    за один день мусять злитися в ОДИН виклик із **дописаним** текстом — інакше вечірній чек-ін
 *    стер би ранковий запис або відкотив настрій.
 *  - `PUT /entries` для часової звички **замінює** хвилини (сервер уже віддав денний підсумок).
 */

/** Дія + чи ввімкнена вона в картці підтвердження (людина може зняти галочку). */
export interface SelectableAction {
  id: string;
  action: CheckinActionDto;
  selected: boolean;
}

/** Стабільний ключ дії — для React-списку й перемикання галочок. */
export const actionId = (a: CheckinActionDto, i: number): string =>
  a.type === "entry"
    ? `entry:${a.habitId}:${a.date}`
    : a.type === "task"
      ? `task:${i}:${a.title}`
      : `${a.type}:${a.date}`;

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );

/**
 * Дописати абзац до наявного HTML щоденника (а не замінити його).
 * Текст із чек-іну — плейн (людина його надиктувала/набрала), тож екрануємо: у нотатці може
 * бути «<3» або «a > b», і без цього воно стало б поламаною розміткою.
 */
export function appendParagraph(existingHtml: string | null, text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const base = existingHtml?.trim();
  return base ? `${base}${paragraphs}` : paragraphs;
}

export interface DailyLogPlan {
  date: string;
  /** null → настрою нема ні в діях, ні в наявному лозі: людина мусить обрати його в картці. */
  mood: number | null;
  notes: string | null;
  /** Чи додається текст у щоденник (для підпису «допишеться до запису за сьогодні»). */
  appendsDiary: boolean;
}

/**
 * Звести обрані `mood`/`diary` дії до одного плану на день, з урахуванням наявного логу.
 * `existing` — те, що вже в БД за цей день (мапа date → {mood, notes}).
 */
export function planDailyLogs(
  actions: CheckinActionDto[],
  existing: Map<string, { mood: number; notes: string | null }>,
): DailyLogPlan[] {
  const byDate = new Map<string, DailyLogPlan>();

  for (const a of actions) {
    if (a.type !== "mood" && a.type !== "diary") continue;
    const prev = existing.get(a.date);
    let plan = byDate.get(a.date);
    if (!plan) {
      plan = {
        date: a.date,
        mood: prev?.mood ?? null,
        notes: prev?.notes ?? null,
        appendsDiary: false,
      };
      byDate.set(a.date, plan);
    }
    if (a.type === "mood") plan.mood = a.value;
    else {
      plan.notes = appendParagraph(plan.notes, a.text);
      plan.appendsDiary = true;
    }
  }

  return [...byDate.values()];
}
