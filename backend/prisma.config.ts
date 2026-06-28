import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 CLI/Migrate-конфіг (заміна `package.json#prisma` + datasource-URL зі schema).
 * Рантайм-клієнт конектиться окремо через driver adapter (src/prisma.ts).
 * Neon: міграції/інтроспекція — через ПРЯМИЙ конект (`DIRECT_URL`), не через пулер.
 *
 * Читаємо `process.env` напряму (а не helper `env()`, який кидає на відсутню змінну): під час
 * `prisma generate` на Docker-білді env ще немає, а generate URL і не потребує. У рантаймі
 * (migrate) DIRECT_URL присутній → міграції працюють.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL,
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
