import DOMPurify from "dompurify";

// Посилання у збереженому HTML робимо безпечними (нова вкладка + без доступу до opener).
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

/** Санітизація HTML щоденника перед рендером (анти-XSS: прибирає скрипти/on*-хендлери тощо). */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

/** Порожній rich-text (жодного видимого тексту) — напр. `""`, `<p></p>`, `<p><br></p>`. */
export function isRichTextEmpty(html: string): boolean {
  return richTextToPlain(html).length === 0;
}

/** Грубе зведення rich-text HTML до простого тексту (для прев'ю в картці). Блокові теги → переноси. */
export function richTextToPlain(html: string): string {
  if (!html) return "";
  return html
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
