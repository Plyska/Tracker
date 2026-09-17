/**
 * Генератор `public/favicon.ico` зі знака `BrandMark`.
 *
 * ## Навіщо окремий скрипт
 *
 * `.ico` — це контейнер із кількох растрів, і кожен споживач бере з нього свій розмір: вкладка
 * браузера — 16/32, панель завдань і закладки — 32/48, видача Google — 48 і більше (Google прямо
 * просить квадрат, кратний 48px, і масштабує все інше). Намалювати їх вручну означало б завести
 * четверту копію знака поряд із `BrandMark.tsx`, `favicon.ts` і `public/favicon.svg`, тож растри
 * печуться з тієї самої геометрії: `brandFaviconRasterSvg()` віддає плоский SVG під конкретний
 * розмір, `sips` його растеризує, далі складаємо контейнер.
 *
 * ## Чому не в `build`
 *
 * `sips` є лише на macOS, а знак міняється раз на рік — тримати цим весь CI в заручниках не варто.
 * Вивід комітимо; скрипт запускають руками після правок геометрії:
 *
 *     npm run gen:favicon
 *
 * Модулі вантажимо через Vite `ssrLoadModule` — так само, як `prerender-landing.mjs`: інакше не
 * розв'язати alias `@/` у `favicon.ts`, і довелося б дублювати кольори акцентів.
 */
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createServer } from "vite";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "public/favicon.ico");

/**
 * 16 — вкладка (там `variantForSize` сам віддасть зріз 2×2), 32 — ретина-вкладка й закладки,
 * 48 — мінімум, який просить Google, 96 — його ж запас під 2× екрани у видачі.
 */
const SIZES = [16, 32, 48, 96];

/** Заголовок + по 16 байт на розмір; далі PNG-и підряд. Ширина 256 пишеться як 0. */
function packIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // тип: іконка (не курсор)
  header.writeUInt16LE(images.length, 4);

  let offset = header.length + images.length * 16;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size % 256, 0); // width
    entry.writeUInt8(size % 256, 1); // height
    entry.writeUInt16LE(1, 4); // площини кольору
    entry.writeUInt16LE(32, 6); // біт на піксель (RGBA)
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)]);
}

async function main() {
  if (process.platform !== "darwin") {
    throw new Error("Растеризація спирається на `sips` — він лише в macOS. Вивід уже в репозиторії.");
  }

  const server = await createServer({
    root,
    appType: "custom",
    logLevel: "error",
    server: { middlewareMode: true },
  });

  let images;
  try {
    const { brandFaviconRasterSvg } = await server.ssrLoadModule("/src/shared/ui/BrandMark/favicon.ts");
    const { ACCENT_COLORS, DEFAULT_ACCENT } = await server.ssrLoadModule("/src/shared/config/accents.ts");
    const { light } = ACCENT_COLORS[DEFAULT_ACCENT];

    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tellday-favicon-"));
    try {
      images = [];
      for (const size of SIZES) {
        const svg = path.join(tmp, `${size}.svg`);
        const png = path.join(tmp, `${size}.png`);
        await fs.writeFile(svg, brandFaviconRasterSvg(light, size));
        await run("sips", ["-s", "format", "png", svg, "--out", png]);
        images.push({ size, png: await fs.readFile(png) });
      }
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  } finally {
    await server.close();
  }

  const ico = packIco(images);
  await fs.writeFile(OUT, ico);
  const parts = images.map(({ size, png }) => `${size}×${size} (${png.length} B)`).join(", ");
  console.log(`${path.relative(root, OUT)}: ${parts} — разом ${ico.length} B`);
}

await main();
