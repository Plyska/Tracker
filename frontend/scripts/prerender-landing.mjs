/**
 * Постбілд-пререндер лендінгу.
 *
 * `vite build` уже поклав `dist/landing.html` з посиланнями на зібрані ассети, але з порожнім
 * `#root` і плейсхолдером шапки. Тут ми рендеримо React-дерево лендінгу в рядок для кожної локалі
 * і записуємо статичний HTML: `dist/landing.html` (en) і `dist/uk/index.html` (uk).
 * Контент є в HTML із першого байта (SEO, no-JS), клієнт лише гідрує.
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
  // en-головна пишеться в сам шаблон: він уже прочитаний у `template`, тож перезапис безпечний.
  const targets = [];
  for (const locale of ["en", "uk"]) {
    const base = locale === "uk" ? path.join(dist, "uk") : dist;
    for (const page of ["home", "privacy", "terms"]) {
      const file =
        page === "home"
          ? locale === "en"
            ? templatePath
            : path.join(base, "index.html")
          : path.join(base, page, "index.html");
      targets.push({ locale, page, file });
    }
  }
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
} finally {
  await server.close();
}
