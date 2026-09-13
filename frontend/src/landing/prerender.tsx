import { renderToString } from "react-dom/server";
import type { Locale } from "./i18n";
import { LandingApp } from "./LandingApp";
import { buildHead } from "./seo";

/**
 * Пререндер для scripts/prerender-landing.mjs: статичний HTML лендінгу + SEO-шапка для локалі.
 * Виконується у Node через Vite `ssrLoadModule`, тому без доступу до `window`.
 */
export function render(locale: Locale): { html: string; head: string } {
  return {
    html: renderToString(<LandingApp locale={locale} />),
    head: buildHead(locale),
  };
}
