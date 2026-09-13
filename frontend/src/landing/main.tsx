import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "./styles/landing.css";
import { localeFromPath } from "./i18n";
import { LandingApp } from "./LandingApp";
import { syncAccent } from "./lib/accent";

/**
 * Точка входу лендінгу (landing.html). Окремий бандл від застосунку: анонімний відвідувач не
 * тягне router/redux/RTK Query/i18next.
 *
 * У проді `#root` уже містить пререндерений HTML (scripts/prerender-landing.mjs) — гідруємо.
 * У dev кореню порожній — звичайний render.
 */
const root = document.getElementById("root")!;
const locale = localeFromPath(window.location.pathname);
const app = (
  <StrictMode>
    <LandingApp locale={locale} />
  </StrictMode>
);

if (root.firstElementChild) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}

// Фавікон — у колір акценту, який FOUC-скрипт уже поклав у data-accent; далі стежимо за зміною.
syncAccent();
