/**
 * Постбілд-пререндер лендінгу.
 *
 * `vite build` уже поклав `dist/landing.html` з посиланнями на зібрані ассети, але з порожнім
 * `#root` і плейсхолдером шапки. Тут ми рендеримо React-дерево лендінгу в рядок для кожної локалі
 * і записуємо статичний HTML. Контент є з першого байта (SEO, no-JS), клієнт лише гідрує.
 *
 * ## Чому скрипт ще й перекладає файли місцями
 *
 * На хостингу `/` має віддавати ЛЕНДІНГ, а не застосунок. Vercel перевіряє файлову систему
 * **раніше** за `rewrites` («precedence is given to the filesystem prior to rewrites being
 * applied»), тож переписати `/` на `landing.html` неможливо, доки поруч лежить `index.html`
 * застосунку — він виграє. Документація Vercel прямо радить перейменувати файл.
 *
 * Робимо це тут, у вивідній теці, а не в репозиторії: вихідні `index.html` / `landing.html` і
 * dev-сервер лишаються як були. У `dist/` виходить `index.html` = лендінг (en), `app.html` =
 * застосунок, куди `vercel.json` переписує все, чого немає на диску.
 *
 * Модуль лендінгу вантажимо через Vite `ssrLoadModule` — не потрібні ні tsx, ні окремий SSR-білд.
 */
import { createServer } from "vite";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const templatePath = path.join(dist, "landing.html");

const template = await fs.readFile(templatePath, "utf8");
if (!template.includes("<!--landing-html-->") || !template.includes("<!--landing-head-->")) {
  throw new Error("dist/landing.html: плейсхолдери пререндеру не знайдено — шаблон уже оброблено?");
}

const server = await createServer({
  root,
  configFile: path.join(root, "vite.config.ts"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

try {
  const { render } = await server.ssrLoadModule("/src/landing/prerender.tsx");
  // Головна + юридичні документи, кожна двома мовами. Vercel віддає `/privacy` як
  // `privacy/index.html` сам (directory index), тож вкладені теки — це і є «чисті» URL.
  // en-головна тепер іде в `dist/index.html` (звільнений застосунком), а не в шаблон.
  const targets = [];
  for (const locale of ["en", "uk"]) {
    const base = locale === "uk" ? path.join(dist, "uk") : dist;
    for (const page of ["home", "privacy", "terms"]) {
      const file =
        page === "home"
          ? path.join(base, "index.html")
          : path.join(base, page, "index.html");
      targets.push({ locale, page, file });
    }
  }
  // Застосунок звільняє `index.html` для лендінгу. Робиться ДО запису сторінок, щоб між
  // перейменуванням і записом не лишалось моменту, коли `/` не віддає нічого.
  await fs.rename(path.join(dist, "index.html"), path.join(dist, "app.html"));
  console.log("prerender: dist/index.html → dist/app.html (застосунок звільнив корінь)");

  for (const { locale, page, file } of targets) {
    const { html, head } = render(locale, page);
    const out = template
      .replace("<!--landing-head-->", head)
      .replace("<!--landing-html-->", html)
      .replace('<html lang="en">', `<html lang="${locale}">`);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, out, "utf8");
    console.log(`prerender: ${path.relative(root, file)} (${locale}/${page}, ${(out.length / 1024).toFixed(1)} KB)`);
  }
  // Шаблон більше не потрібен: його вміст уже в `index.html`. Лишити означало б віддавати ту саму
  // сторінку ще й на `/landing.html` — зайвий дубль для пошуковиків.
  await fs.rm(templatePath, { force: true });
  console.log("prerender: dist/landing.html прибрано (шаблон, дубль головної)");
} finally {
  await server.close();
}
