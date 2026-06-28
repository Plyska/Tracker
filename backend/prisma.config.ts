import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 CLI/Migrate-конфіг (заміна `package.json#prisma` + datasource-URL зі schema).
 * Рантайм-клієнт конектиться окремо через driver adapter (src/prisma.ts).
 * Neon: міграції/інтроспекція — через ПРЯМИЙ конект (`DIRECT_URL`), не через пулер.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
