/**
 * Перетворення HTML нотаток щоденника (рich-text із TipTap) у текст.
 *
 * Два різні призначення, тому дві функції:
 *  - `stripHtml` — грубе зведення, лише щоб відсіяти «порожні» нотатки (`<p></p>`);
 *  - `htmlToPlainText` — читабельний текст для контексту AI (зберігає межі абзаців/списків,
 *    інакше модель бачить злиплу стіну слів).
 *
 * Це НЕ санітизація (нею займається DOMPurify на клієнті) — лише витяг тексту.
 */

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

const decodeEntities = (s: string): string =>
  s.replace(/&(?:nbsp|amp|lt|gt|quot|apos|#39);/g, (m) => ENTITIES[m] ?? m);

/** Грубе зведення HTML до тексту — для перевірки «чи нотатка непорожня». */
export const stripHtml = (html: string): string =>
  decodeEntities(html.replace(/<[^>]*>/g, "")).trim();

/**
 * Читабельний текст: блокові теги → переноси рядків, `<li>` → «• », решта тегів прибирається.
 * Порожні рядки згортаються, щоб не палити токени на розмітку.
 */
export const htmlToPlainText = (html: string): string =>
  decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<\/(p|div|h[1-6]|li|blockquote|ul|ol)>/gi, "\n")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .trim();

/** Обрізати текст до `max` символів по межі слова, додавши «…». */
export const truncateText = (text: string, max: number): string => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
};
