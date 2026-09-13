/**
 * SEO-шапка лендінгу: title/description, canonical + hreflang, Open Graph, Twitter Card,
 * JSON-LD `SoftwareApplication`. Один генератор для dev-плагіна Vite (підставляє в
 * `landing.html` на льоту) і для постбілд-пререндеру (`scripts/prerender-landing.mjs`).
 *
 * Лише відносні імпорти: файл тягне `vite.config.ts`, де alias `@/` не працює.
 */
import { dictionaries, localePath, type Locale } from "./i18n.ts";

export const SITE_URL = "https://tellday.app";
export const OG_IMAGE_PATH = "/og.png";

const absolute = (path: string) => `${SITE_URL}${path === "/" ? "/" : path}`;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Мітка локалі для og:locale. */
const OG_LOCALE: Record<Locale, string> = { en: "en_US", uk: "uk_UA" };

export function buildHead(locale: Locale): string {
  const t = dictionaries[locale];
  const url = absolute(localePath(locale));
  const title = escapeHtml(t.meta.title);
  const description = escapeHtml(t.meta.description);
  const image = absolute(OG_IMAGE_PATH);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Tellday",
    url,
    description: t.meta.description,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    inLanguage: [locale, ...(locale === "en" ? ["uk"] : ["en"])],
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    image,
  };

  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<link rel="alternate" hreflang="en" href="${absolute("/")}" />`,
    `<link rel="alternate" hreflang="uk" href="${absolute("/uk")}" />`,
    `<link rel="alternate" hreflang="x-default" href="${absolute("/")}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Tellday" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escapeHtml(t.meta.ogAlt)}" />`,
    `<meta property="og:locale" content="${OG_LOCALE[locale]}" />`,
    `<meta property="og:locale:alternate" content="${OG_LOCALE[locale === "en" ? "uk" : "en"]}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />`,
    `<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />`,
    // `<` у JSON екрануємо, щоб текст не міг закрити тег script.
    `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`,
  ].join("\n    ");
}

/** Підставляє шапку й `lang` у шаблон `landing.html` (плейсхолдер `<!--landing-head-->`). */
export function injectLandingHead(template: string, locale: Locale): string {
  return template
    .replace("<!--landing-head-->", buildHead(locale))
    .replace('<html lang="en">', `<html lang="${locale}">`);
}
