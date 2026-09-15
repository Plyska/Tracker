/**
 * Юридичні документи як **дані**, а не як JSX.
 *
 * Дві мови мають лишатись структурно паралельними: той самий набір розділів, ті самі `id`
 * (на них ведуть якорі й посилання з інших сторінок). Коли текст — це масив розділів, а не
 * розмітка, розходження видно з першого погляду, а рендер один для обох.
 *
 * Абзац — рядок із мінімальною інлайн-розміткою: `[текст](url)` для посилань і `**текст**` для
 * виділення. Більше не треба: юридичний документ має читатись, а не форматуватись.
 */
export type LegalBlock =
  | string
  | { list: string[] }
  | { table: { head: string[]; rows: string[][] } };

export interface LegalSection {
  /** Стабільний якір (`#data`), однаковий для обох мов. */
  id: string;
  heading: string;
  body: LegalBlock[];
}

export interface LegalDoc {
  title: string;
  /** Один абзац під заголовком: про що документ і як його читати. */
  lead: string;
  updated: string;
  sections: LegalSection[];
}

export type LegalDocKind = "privacy" | "terms";
