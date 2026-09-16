import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vite.dev/config/
import path from "node:path";
import { readFileSync } from "node:fs";
import { injectLandingHead } from "./src/landing/seo.ts";
import { localeFromPath, pageFromPath } from "./src/landing/i18n.ts";

const dirname = import.meta.dirname;

/**
 * Версія продукту — з `package.json`, а не з рядка в перекладах.
 *
 * Номер, який лежить у словниках, доводиться правити в кожній мові окремо, і рано чи пізно
 * українська показує одну версію, англійська — іншу. Тут джерело одне, а в застосунок число
 * потрапляє на збірці: у бандлі лишається літерал, самого `package.json` туди не тягне.
 */
const appVersion = (
  JSON.parse(readFileSync(path.resolve(dirname, "package.json"), "utf8")) as { version: string }
).version;

/**
 * Лендінг — окрема точка входу (`landing.html` + `src/landing/main.tsx`), щоб анонімний відвідувач
 * не тягнув бандл застосунку. Плагін відтворює в dev те, що в проді робить Express:
 * `/` і `/uk` → landing.html; решта не-API шляхів → index.html (SPA).
 * У білді head підставляє постбілд-пререндер (`scripts/prerender-landing.mjs`), тому `apply: "serve"`.
 */
const LANDING_PATHS = new Set(["/", "/uk", "/privacy", "/terms", "/uk/privacy", "/uk/terms"]);

function landingDevPlugin(): Plugin {
  return {
    name: "tellday-landing-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const raw = req.url ?? "";
        const [pathname, query] = raw.split("?");
        // Усі сторінки лендінг-entry (головна + юридичні, обома мовами) → один шаблон;
        // яку саме рендерити, вирішує `pageFromPath` уже в застосунку.
        const clean = pathname.replace(/\/+$/, "") || "/";
        if (LANDING_PATHS.has(clean)) {
          req.url = `/landing.html${query ? `?${query}` : ""}`;
        }
        next();
      });
    },
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        if (!ctx.filename.endsWith("landing.html")) return html;
        const url = (ctx.originalUrl ?? "/").split("?")[0];
        return injectLandingHead(html, localeFromPath(url), pageFromPath(url));
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
/**
 * Завантаження source maps у Sentry — лише для збірки ЗАСТОСУНКУ.
 *
 * Без map-файлів стектрейси в проді складаються з мініфікованих імен (`t.a is not a function`),
 * тобто марні. Але й лишати їх у `dist/` не можна — це публікація вихідного коду фронтенду, тож
 * `filesToDeleteAfterUpload` прибирає їх одразу після вивантаження.
 *
 * **Не для лендінгу**: `vite build --mode landing` — окрема збірка в той самий `dist/`, і Sentry
 * там не підключений (див. `app/sentry.ts`). Вивантажувати нема чого, а плагін інакше спрацював би
 * двічі й другим заходом затер release першого.
 *
 * **Регіон нічим не задаємо**: організаційний токен (`sntrys_`) несе обидві адреси всередині —
 * `sentry.io` для акаунта і `de.sentry.io` (EU) для даних, — і плагін бере їх звідти. Спроба
 * прописати EU-адресу вручну лише конфліктувала з першою: плагін попереджав, що поважає токен, а
 * не конфіг. Якщо колись тут опиниться токен іншого типу (`sntryu_`, персональний), регіон
 * доведеться задати явно — саме він адрес у собі не несе.
 *
 * Токен (`SENTRY_AUTH_TOKEN`) плагін підхоплює сам із `.env.sentry-build-plugin` — файл створив
 * майстер, він у `.gitignore` і в коміт не потрапляє. На Vercel змінну треба задати руками, інакше
 * білд мовчки пройде без map-файлів.
 */
const sourcemapUpload = () =>
  sentryVitePlugin({
    org: "tellday",
    project: "tellday-web",
    sourcemaps: {
      filesToDeleteAfterUpload: ["./dist/assets/**/*.map"],
    },
    // Без токена плагін лише попереджає й пропускає вивантаження — локальна збірка не падає.
    telemetry: false,
  });

export default defineConfig(({ mode }) => {
  const isLanding = mode === "landing";
  return {
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    plugins: [
      react(),
      tailwindcss(),
      landingDevPlugin(),
      ...(isLanding ? [] : [sourcemapUpload()]),
    ],
    resolve: {
      alias: {
        "@": path.resolve(dirname, "./src"),
      },
    },
    build: {
      // `hidden`, а не `true`: map-файли генеруються для вивантаження в Sentry, але **без
      // коментаря `sourceMappingURL`** у бандлі. Інакше браузер шукав би `.map`, який
      // `filesToDeleteAfterUpload` уже прибрав, і кожне відкриття devtools давало б 404.
      // Sentry зіставляє бандл із мапою не через цей коментар, а через вшитий `debugId`.
      // Для лендінгу не генеруємо взагалі — Sentry там не підключений.
      sourcemap: isLanding ? false : "hidden",
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
