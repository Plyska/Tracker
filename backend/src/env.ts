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

  // ── AI-компаньйон (ADR 0012) ─────────────────────────────────────────────────────────────
  // Провайдер — за швом `AiProvider` (modules/ai/ai.client.ts); зміна = env, не код.
  AI_PROVIDER: z.enum(["gemini", "anthropic"]).default("gemini"),
  // Ключ ОПЦІЙНИЙ локально (без нього /ai/* віддає 503 AI_UNAVAILABLE), у проді — обов'язковий
  // (guard нижче, фейл-фаст як для JWT-секретів).
  GEMINI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  // Модель провайдера; без значення — дефолт за провайдером (див. export `aiModel`).
  AI_MODEL: z.string().min(1).optional(),
  // Денна квота запитів до LLM на користувача (лист/чек-ін/чат) → 429 AI_QUOTA_EXCEEDED.
  AI_DAILY_MESSAGE_LIMIT: z.coerce.number().int().positive().default(20),
  // Стеля розміру контекст-паку (токени, орієнтовно) — щоб рахунок не ріс із історією.
  AI_CONTEXT_MAX_TOKENS: z.coerce.number().int().positive().default(6000),
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

// AI: ключ активного провайдера. Локально може бути відсутній (фіча деградує до 503),
// у проді — фейл-фаст: тихий деплой без AI гірший за помітну помилку старту.
const aiApiKey =
  raw.AI_PROVIDER === "gemini" ? raw.GEMINI_API_KEY : raw.ANTHROPIC_API_KEY;
if (raw.NODE_ENV === "production" && !aiApiKey) {
  // eslint-disable-next-line no-console
  console.error(
    `Refusing to start: AI_PROVIDER=${raw.AI_PROVIDER} but its API key is not set ` +
      `(${raw.AI_PROVIDER === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY"}).`,
  );
  process.exit(1);
}

// Дефолтна модель за провайдером. Gemini — Flash на free tier (ADR 0012 / план §3.5);
// Anthropic — Opus 5 (поточна рекомендація). Перекривається AI_MODEL.
const AI_DEFAULT_MODEL: Record<typeof raw.AI_PROVIDER, string> = {
  gemini: "gemini-3.8-flash",
  anthropic: "claude-opus-5",
};

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === "production",
  corsOrigins: raw.CORS_ORIGIN.split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  aiProvider: raw.AI_PROVIDER,
  aiApiKey, // undefined → AI недоступний (503), сервер працює
  aiModel: raw.AI_MODEL ?? AI_DEFAULT_MODEL[raw.AI_PROVIDER],
  aiDailyMessageLimit: raw.AI_DAILY_MESSAGE_LIMIT,
  aiContextMaxTokens: raw.AI_CONTEXT_MAX_TOKENS,
};
