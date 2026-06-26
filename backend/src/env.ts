import { config } from "dotenv";
import { z } from "zod";

// Завантажуємо .env до читання process.env (фейл-фаст на старті, не в рантаймі запиту).
config();

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1).optional(),
  // >= 32 символів: достатня ентропія для HS256-підпису access-JWT.
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be >= 32 chars"),
  // Попередній секрет (опційно) — для zero-downtime ротації: старі токени ще валідуються
  // проти нього, нові підписуються поточним. Прибрати після TTL access-токена.
  JWT_ACCESS_SECRET_PREVIOUS: z
    .string()
    .min(32, "JWT_ACCESS_SECRET_PREVIOUS must be >= 32 chars")
    .optional(),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  // Кома-розділений список дозволених origin-ів для CORS.
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

const raw = parsed.data;

// Прод-guard: не запускатись із плейсхолдер-секретами з .env.example (типова помилка деплою).
const PLACEHOLDER_SECRETS = ["change-me-access-secret", "secret", "changeme"];
if (
  raw.NODE_ENV === "production" &&
  PLACEHOLDER_SECRETS.includes(raw.JWT_ACCESS_SECRET)
) {
  // eslint-disable-next-line no-console
  console.error(
    "Refusing to start: JWT_ACCESS_SECRET is a placeholder. Set a real secret (openssl rand -base64 48).",
  );
  process.exit(1);
}

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === "production",
  corsOrigins: raw.CORS_ORIGIN.split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
