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
 * Шари знака: варіант сітки + його посадка в плашку 32×32. Тримаємо парою, бо зріз 2×2 має власний
 * масштаб — інакше клітинки виходять за плашку. Звідси малює і SVG-фавікон, і растр для `.ico`
 * (`scripts/generate-favicon.mjs`), тож зміна масштабу доходить в обидва боки сама.
 */
const LAYERS = {
  grid: { geometry: GRID, transform: "translate(4 4) scale(.75)" },
  cut: { geometry: CUT, transform: "translate(4.48 4.48) scale(.72)" },
} as const;

export type MarkVariant = keyof typeof LAYERS;

/** Розмір, з якого сітка 3×3 ще читається; нижче — зріз 2×2 (px). */
const CUT_MAX_PX = 20;

/** Варіант знака для розміру, у якому його растеризують. */
export const variantForSize = (px: number): MarkVariant => (px <= CUT_MAX_PX ? "cut" : "grid");

const layer = (variant: MarkVariant, cls?: string): string => {
  const { geometry, transform } = LAYERS[variant];
  return (
    `<g ${cls ? `class="${cls}" ` : ""}fill="#fff" transform="${transform}">` +
    `${rects(geometry)}</g>`
  );
};

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
    `.s{display:none}@media (max-width:${CUT_MAX_PX}px){.g{display:none}.s{display:inline}}</style>` +
    `<rect class="p" width="32" height="32" rx="8"/>` +
    layer("grid", "g") +
    layer("cut", "s") +
    `</svg>`
  );
}

/**
 * Плоский SVG під растеризацію в `.ico`. Растр не має ні теми, ні розміру перегляду, тож обидва
 * медіазапити треба вирішити наперед: колір приходить параметром (світлий — плашка читається і на
 * темному тлі видачі Google), варіант сітки — з `variantForSize`. `width`/`height` задають розмір,
 * у якому растеризатор малює: беремо цільовий, щоб не було даунсемплу з мила.
 */
export function brandFaviconRasterSvg(color: string, px: number): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${px}" height="${px}">` +
    `<rect width="32" height="32" rx="8" fill="${color}"/>` +
    layer(variantForSize(px)) +
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
