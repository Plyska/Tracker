import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
import path from "node:path";
import { injectLandingHead } from "./src/landing/seo.ts";
import { localeFromPath } from "./src/landing/i18n.ts";

const dirname = import.meta.dirname;

/**
 * Лендінг — окрема точка входу (`landing.html` + `src/landing/main.tsx`), щоб анонімний відвідувач
 * не тягнув бандл застосунку. Плагін відтворює в dev те, що в проді робить Express:
 * `/` і `/uk` → landing.html; решта не-API шляхів → index.html (SPA).
 * У білді head підставляє постбілд-пререндер (`scripts/prerender-landing.mjs`), тому `apply: "serve"`.
 */
function landingDevPlugin(): Plugin {
  return {
    name: "tellday-landing-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const raw = req.url ?? "";
        const [pathname, query] = raw.split("?");
        if (pathname === "/" || pathname === "/uk" || pathname === "/uk/") {
          req.url = `/landing.html${query ? `?${query}` : ""}`;
        }
        next();
      });
    },
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        if (!ctx.filename.endsWith("landing.html")) return html;
        const locale = localeFromPath((ctx.originalUrl ?? "/").split("?")[0]);
        return injectLandingHead(html, locale);
      },
    },
  };
}

/**
 * Два білди в один `dist/`: `vite build` — застосунок (index.html), `vite build --mode landing` —
 * лендінг (landing.html). Окремі білди, а не два input в одному, свідомо: спільний бандлер виніс би
 * react/framer/lucide у чанк, спільний із застосунком, і лендінг вантажив би повний framer-motion
 * замість LazyMotion-підмножини. Дублювання react між бандлами не коштує нічого — вони ніколи не
 * завантажуються разом (перехід лендінг → застосунок — повне перезавантаження сторінки).
 */
export default defineConfig(({ mode }) => {
  const isLanding = mode === "landing";
  return {
    plugins: [react(), tailwindcss(), landingDevPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(dirname, "./src"),
      },
    },
    build: {
      // Другий білд не має стерти перший.
      emptyOutDir: !isLanding,
      rollupOptions: {
        input: path.resolve(dirname, isLanding ? "landing.html" : "index.html"),
      },
    },
    server: {
      host: true,
      port: 5173,
      watch: {
        usePolling: true,
      },
    },
  };
});
