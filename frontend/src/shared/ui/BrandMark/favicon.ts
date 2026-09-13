import { ACCENT_COLORS, DEFAULT_ACCENT, type AccentKey } from "@/shared/config/accents";
import { CUT, GRID, PAST_OPACITY, cells, type MarkGeometry } from "./geometry";

const rects = (g: MarkGeometry): string =>
  cells(g)
    .map(
      ({ x, y, today }) =>
        `<rect x="${x}" y="${y}" width="${g.size}" height="${g.size}" rx="${g.radius}"` +
        (today ? "" : ` opacity="${PAST_OPACITY}"`) +
        "/>",
    )
    .join("");

/**
 * SVG фавікона: плашка r8 + знак. Медіазапити всередині читають розмір, у якому браузер растеризує
 * іконку: ≤20px — зріз 2×2 замість сітки, інакше повна сітка; `prefers-color-scheme` тут — тема
 * панелі вкладок браузера, а не застосунку, тому кольори плашки передаються парою.
 * `public/favicon.svg` — вивід цієї функції для дефолтного акценту (з коментарем).
 */
export function brandFaviconSvg({ light, dark }: { light: string; dark: string }): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    `<style>.p{fill:${light}}@media (prefers-color-scheme:dark){.p{fill:${dark}}}` +
    `.s{display:none}@media (max-width:20px){.g{display:none}.s{display:inline}}</style>` +
    `<rect class="p" width="32" height="32" rx="8"/>` +
    `<g class="g" fill="#fff" transform="translate(4 4) scale(.75)">${rects(GRID)}</g>` +
    `<g class="s" fill="#fff" transform="translate(4.48 4.48) scale(.72)">${rects(CUT)}</g>` +
    `</svg>`
  );
}

/** `data:`-URI для `<link rel="icon">`. */
export const brandFaviconDataUri = (colors: { light: string; dark: string }): string =>
  `data:image/svg+xml,${encodeURIComponent(brandFaviconSvg(colors))}`;

const LINK_SELECTOR = 'link[rel="icon"][type="image/svg+xml"]';

/**
 * Фавікон у колір акценту: SVG-лінк отримує `data:`-URI з кольорами акценту. Для дефолтного
 * акценту повертаємо статичний `/favicon.svg` (той самий малюнок) — так перший кадр і закладки не
 * отримують зайвої підміни. Safari SVG-фавікони ігнорує — там лишається `.ico`.
 * Спільне для застосунку (ThemeProvider) і лендінгу (lib/accent).
 */
export function applyBrandFavicon(accent: AccentKey): void {
  const link = document.querySelector<HTMLLinkElement>(LINK_SELECTOR);
  if (!link) return;
  link.dataset.defaultHref ??= link.href;
  link.href =
    accent === DEFAULT_ACCENT ? link.dataset.defaultHref : brandFaviconDataUri(ACCENT_COLORS[accent]);
}
