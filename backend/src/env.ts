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

  // ── Транзакційна пошта (підтвердження адреси, скидання пароля) ───────────────────────────
  // Провайдер за швом `EmailTransport` (lib/email) — як і в AI. Без ключа працює `console`:
  // лист друкується в stdout разом із посиланням. Це не заглушка «щоб компілювалось», а робочий
  // режим розробки: обидва флоу можна пройти повністю до того, як зʼявиться домен і DNS.
  EMAIL_PROVIDER: z.enum(["resend", "console"]).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  // Відправник. Домен мусить бути верифікований у провайдера (SPF/DKIM), інакше лист або не піде,
  // або впаде в спам. Приклад: "Tracker <no-reply@tracker.app>".
  EMAIL_FROM: z.string().min(3).default("Tracker <onboarding@resend.dev>"),
  // Базовий URL фронтенду для посилань у листах. Не виводимо з CORS_ORIGIN: там може бути список,
  // а в лист треба рівно одну адресу — і помилка тут відправляє людину в чужий застосунок.
  APP_URL: z.string().url().default("http://localhost:5173"),

  // ── AI-компаньйон (ADR 0012) ─────────────────────────────────────────────────────────────
  // Провайдер — за швом `AiProvider` (modules/ai/ai.client.ts); зміна = env, не код.
  AI_PROVIDER: z.enum(["groq", "gemini", "anthropic"]).default("groq"),
  // Ключ ОПЦІЙНИЙ локально (без нього /ai/* віддає 503 AI_UNAVAILABLE), у проді — обов'язковий
  // (guard нижче, фейл-фаст як для JWT-секретів).
  GROQ_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  // Базовий URL для OpenAI-сумісних провайдерів. Без значення — дефолт провайдера; задається
  // руками лише щоб націлити ту саму реалізацію на іншого сумісного (Cerebras, OpenRouter…).
  AI_BASE_URL: z.string().url().optional(),
  // Модель провайдера; без значення — дефолт за провайдером (див. export `aiModel`).
  AI_MODEL: z.string().min(1).optional(),
  // Денна квота запитів до LLM на користувача (лист/чек-ін/чат) → 429 AI_QUOTA_EXCEEDED.
  // 15 — не dev-значення, а продуктова стеля на ОДНОГО користувача: вона лишається і на платному
  // тирі. Сенс той самий, обмежує різне: на безкоштовному — спільну стелю ключа, на платному —
  // рахунок. Один виклик ≈4 200 токенів, тож 15/добу ≈ 63 000 на людину (заміряно 2026-09-09).
  AI_DAILY_MESSAGE_LIMIT: z.coerce.number().int().positive().default(15),
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
const AI_KEY_VAR = {
  groq: "GROQ_API_KEY",
  gemini: "GEMINI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
} as const;

const aiApiKey = {
  groq: raw.GROQ_API_KEY,
  gemini: raw.GEMINI_API_KEY,
  anthropic: raw.ANTHROPIC_API_KEY,
}[raw.AI_PROVIDER];

if (raw.NODE_ENV === "production" && !aiApiKey) {
  // eslint-disable-next-line no-console
  console.error(
    `Refusing to start: AI_PROVIDER=${raw.AI_PROVIDER} but its API key is not set ` +
      `(${AI_KEY_VAR[raw.AI_PROVIDER]}).`,
  );
  process.exit(1);
}

/**
 * Пошта в проді мусить бути справжньою. `console`-транспорт там означає, що людина, яка забула
 * пароль, ніколи не отримає листа, а ми про це не дізнаємось: усі ендпоінти віддають 204 навмисно
 * (щоб не розкривати, чи існує адреса), тож мовчазна відмова виглядає як успіх. Краще не стартувати.
 */
if (raw.NODE_ENV === "production" && (raw.EMAIL_PROVIDER ?? "console") === "console") {
  // eslint-disable-next-line no-console
  console.error(
    "Refusing to start: transactional email is not configured " +
      "(set RESEND_API_KEY, or EMAIL_PROVIDER explicitly).",
  );
  process.exit(1);
}

// Дефолтна модель за провайдером. Gemini — Flash на free tier (ADR 0012 / план §3.5);
// Anthropic — Opus 5 (поточна рекомендація). Перекривається AI_MODEL.
//
// Свідомо НЕ найновіший Flash: на безкоштовному тирі `gemini-3.8-flash` стабільно віддавав 503
// «high demand» (найсвіжіша модель — найзавантаженіша), і чек-ін не проходив узагалі. 3.7 при
// тій самій якості розбору відповідає. Це вибір на час розробки; при переході на платний тир
// (план §3.6) модель усе одно перезатверджується.
const AI_DEFAULT_MODEL: Record<typeof raw.AI_PROVIDER, string> = {
  groq: "openai/gpt-oss-120b",
  gemini: "gemini-3.7-flash",
  anthropic: "claude-opus-5",
};

/**
 * Базовий URL OpenAI-сумісних провайдерів. Одна реалізація обслуговує всіх — щоб націлити її на
 * Cerebras чи OpenRouter, достатньо `AI_BASE_URL`, без рядка коду.
 */
const AI_DEFAULT_BASE_URL: Partial<Record<typeof raw.AI_PROVIDER, string>> = {
  groq: "https://api.groq.com/openai/v1",
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
  aiBaseUrl: raw.AI_BASE_URL ?? AI_DEFAULT_BASE_URL[raw.AI_PROVIDER],
  aiDailyMessageLimit: raw.AI_DAILY_MESSAGE_LIMIT,
  aiContextMaxTokens: raw.AI_CONTEXT_MAX_TOKENS,
  // Без ключа — `console`: у розробці це нормальний режим, у проді guard нижче не дасть стартувати.
  emailProvider: raw.EMAIL_PROVIDER ?? (raw.RESEND_API_KEY ? "resend" : "console"),
  emailFrom: raw.EMAIL_FROM,
  appUrl: raw.APP_URL.replace(/\/+$/, ""),
};
