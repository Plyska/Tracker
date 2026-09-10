import { z } from "zod";
import { prisma } from "../../prisma.js";
import { audit } from "../../lib/audit.js";
import { Errors } from "../../lib/errors.js";
import { getAiProvider } from "./ai.client.js";
import { buildContextPack, type AiPeriod, type ContextPack } from "./ai.context.js";
import {
  buildReflectionInstruction,
  buildSystemPrompt,
  crisisReply,
  toAddressForm,
  weekdayCalendar,
  type PromptAddress,
  type AiLocale,
} from "./ai.prompts.js";
import { screenForCrisis } from "./ai.crisis.js";
import { consumeQuota } from "./ai.quota.js";
import { periodKeyBounds } from "./ai.dates.js";

/**
 * Тижневий/місячний лист-підсумок (ADR 0012, план §3.1).
 *
 * Три властивості, заради яких усе й будувалось:
 *  1. **Structured output** — модель віддає JSON за схемою, тож фронт рендерить КАРТКАМИ
 *     (перемоги/просідання/патерн/питання), а не «стіною тексту».
 *  2. **Кеш на період** — один рядок `AiReflection` на (user, period, periodKey). Повторне
 *     відкриття = 0 токенів, а історія листів з'являється як побічний ефект кешу.
 *  3. **Валідація посилань** — `habitId` з відповіді звіряємо з контекстом; вигадані id
 *     викидаємо. Модель не може «послатися» на неіснуючу навичку.
 */

// Сам лист — ~220 токенів, але у Gemini в цей бюджет входять і токени «мислення», тож стеля
// з запасом: обрізаний JSON = невалідна відповідь і змарнований виклик, економія тут не варта ризику.
const MAX_OUTPUT_TOKENS = 1500;

// Схема результату. Джерело істини — тут: з неї ж генерується JSON Schema для провайдера.
const reflectionItemSchema = z.object({
  habitId: z.string().nullable(),
  text: z.string().min(1).max(400),
});

export const reflectionContentSchema = z.object({
  headline: z.string().min(1).max(300),
  highlights: z.array(reflectionItemSchema).max(4),
  slips: z.array(reflectionItemSchema).max(3),
  pattern: z
    .object({
      kind: z.enum(["synergy", "weekday", "mood", "time", "streak", "none"]),
      text: z.string().min(1).max(400),
    })
    .nullable(),
  question: z.string().min(1).max(300),
  /**
   * Тепла нотатка про підтримку, коли сигнали стійкі (довго низький настрій) — і `null`, коли їх
   * немає. Окреме поле, бо в прогоні лист на семи днях настрою 2 фахівця не згадав узагалі:
   * решта полів habit-подібні, і турботі просто не було куди подітися.
   */
  care: z.string().max(400).nullable(),
});

export type ReflectionContent = z.infer<typeof reflectionContentSchema>;

/**
 * JSON Schema для провайдера. Пишемо руками (не генератором із zod), бо провайдери підтримують
 * лише підмножину JSON Schema — тут рівно те, що безпечно: типи, required, enum, описи.
 * `habitId: [string, null]` — модель має явно ставити null, коли пункт не про конкретну навичку.
 */
const REFLECTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string", description: "One warm opening sentence about the period." },
    highlights: {
      type: "array",
      maxItems: 4,
      description: "What went well. Specific, with real numbers from the context.",
      items: {
        type: "object",
        properties: {
          habitId: {
            type: ["string", "null"],
            description: "Copy verbatim from context.habits[].id, or null if not habit-specific.",
          },
          text: { type: "string" },
        },
        required: ["habitId", "text"],
      },
    },
    slips: {
      type: "array",
      maxItems: 3,
      description: "What slipped. Non-judgmental, factual.",
      items: {
        type: "object",
        properties: {
          habitId: { type: ["string", "null"] },
          text: { type: "string" },
        },
        required: ["habitId", "text"],
      },
    },
    pattern: {
      type: ["object", "null"],
      description: "ONE noticed pattern, or null if the data does not support one.",
      properties: {
        kind: { type: "string", enum: ["synergy", "weekday", "mood", "time", "streak", "none"] },
        text: { type: "string" },
      },
      required: ["kind", "text"],
    },
    question: { type: "string", description: "ONE open question the user can reply to." },
    care: {
      type: ["string", "null"],
      description:
        "When signals are persistent (mood low for many days in a row), one warm sentence " +
        "suggesting they talk to someone they trust or a professional. No diagnosis, no advice. " +
        "null when there is no such signal. This is NOT about habits.",
    },
  },
  required: ["headline", "highlights", "slips", "pattern", "question", "care"],
} as const;

/** Прибрати посилання на неіснуючі навички — модель не може вигадати id. */
function sanitizeReferences(content: ReflectionContent, pack: ContextPack): ReflectionContent {
  const known = new Set(pack.habits.map((h) => h.id));
  const fix = (items: ReflectionContent["highlights"]) =>
    items.map((i) => ({ ...i, habitId: i.habitId && known.has(i.habitId) ? i.habitId : null }));
  return {
    ...content,
    highlights: fix(content.highlights),
    slips: fix(content.slips),
    pattern: content.pattern?.kind === "none" ? null : content.pattern,
  };
}


export interface ReflectionResult {
  period: AiPeriod;
  periodKey: string;
  /** Межі періоду (ISO). Віддає СЕРВЕР: клієнт не має відтворювати правила ISO-тижня. */
  periodStart: string;
  periodEnd: string;
  locale: string;
  /** `null` рівно тоді, коли `crisis` не `null`: у кризі листа немає, є відповідь. */
  content: ReflectionContent | null;
  /** Кризова відповідь НАШИМ текстом. Клієнт бачить її замість листа. */
  crisis: string | null;
  createdAt: string;
  /** true → віддано з кешу (нуль токенів). Корисно для UI («оновлено щойно») і для аудиту. */
  cached: boolean;
}

/**
 * Отримати лист: спершу кеш, інакше генерація. Ідемпотентно за (user, period, periodKey) —
 * повторні відкриття сторінки не коштують нічого.
 *
 * Свідомо БЕЗ фонової пре-генерації: Neon засинає без запитів, і ми не тримаємо крон у процесі
 * (backend/CLAUDE.md). Генеруємо, коли користувач прийшов — БД і так прокинулась.
 */
export async function getOrCreateReflection(
  userId: string,
  period: AiPeriod,
  today: string,
  locale: AiLocale,
  diaryOptIn: boolean,
  address: PromptAddress,
): Promise<ReflectionResult> {
  const { pack, bounds } = await buildContextPack(userId, period, today, locale, diaryOptIn);

  const cachedRow = await prisma.aiReflection.findUnique({
    where: { userId_period_periodKey: { userId, period, periodKey: bounds.key } },
  });
  // Кеш валідний лише для ТІЄЇ САМОЇ мови й форми звертання. Ключ `(userId, period, periodKey)`
  // не містить ні того, ні того, тож без цієї перевірки людина, що перемкнула мову, діставала
  // старий лист чужою мовою з `cached: true` — і не могла отримати новий НІКОЛИ. З родом м'якше
  // (само вилікувалось би наступного тижня), але симптом гірший: перемикач у Налаштуваннях не
  // давав би жодного видимого ефекту саме там, де його вмикають.
  // Рід звіряємо лише для української — в англійському листі він не має роботи, і регенерація
  // через нього була б витраченим викликом. `null` у старих рядках = `neutral`.
  const sameLocale = cachedRow?.locale === locale;
  const sameAddress = locale !== "uk" || toAddressForm(cachedRow?.addressForm) === address;
  if (cachedRow && sameLocale && sameAddress) {
    audit("ai.reflection", { userId, period, cached: true });
    return {
      period,
      periodKey: cachedRow.periodKey,
      periodStart: bounds.from,
      periodEnd: bounds.to,
      locale: cachedRow.locale,
      content: cachedRow.content as ReflectionContent,
      crisis: null,
      createdAt: cachedRow.createdAt.toISOString(),
      cached: true,
    };
  }

  // Немає з чого писати — краще чесна порожнеча, ніж лист-вода (і нуль витрат).
  if (pack.notes.sparse) throw Errors.aiNotEnoughData();

  const provider = getAiProvider();

  /**
   * Кризовий скрин ПЕРЕД генерацією листа — і не покладаючись на те, що лист сам помітить.
   *
   * У прогоні тон-тестів щоденник із явними думками про смерть дав лист про звички: схема
   * habit-подібна, і кризі нікуди подітися. Тут же питання одне й перевірне, а модель у таких
   * сильна (100% точності на 16 пастках). Спрацював — лист НЕ генеруємо взагалі: людині потрібна
   * відповідь, а не підсумок тижня. Заразом економимо дорогий виклик.
   *
   * Збій класифікатора не блокує лист: далі спрацює `care` у самій схемі — вужча мережа, але
   * краще за мовчання. Кризову відповідь не кешуємо: вона про «зараз», не про період.
   */
  if (pack.diary?.length) {
    const flagged = await screenForCrisis(provider, pack.diary, userId, today);
    if (flagged) {
      audit("ai.reflection", { userId, period, cached: false });
      return {
        period,
        periodKey: bounds.key,
        periodStart: bounds.from,
        periodEnd: bounds.to,
        locale,
        content: null,
        crisis: crisisReply(locale),
        createdAt: new Date().toISOString(),
        cached: false,
      };
    }
  }
  const result = await provider.generateJson({
    system: buildSystemPrompt(locale, "letter", address),
    // Контекст іде ВІДМЕЖОВАНИМ блоком як дані (анти-injection зі щоденника) — межу описує
    // системний промпт, а тут ми лише дотримуємось тієї ж форми.
    // Календар періоду — окремим рядком перед даними. Без нього модель називала дні навмання
    // («пропуски починаючи з понеділка», коли вони з четверга) — див. S6 у тон-тестах.
    user: [
      buildReflectionInstruction(locale, period),
      weekdayCalendar(locale, bounds.from, bounds.to),
      `<user_data>\n${JSON.stringify(pack)}\n</user_data>`,
    ].join("\n\n"),
    schema: REFLECTION_JSON_SCHEMA,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    effort: "low",
  });

  let parsed: ReflectionContent;
  try {
    parsed = sanitizeReferences(reflectionContentSchema.parse(JSON.parse(result.text)), pack);
  } catch {
    // Провайдер повернув не те, що обіцяв схемою — це збій провайдера, не помилка користувача.
    throw Errors.aiUnavailable("AI returned malformed reflection");
  }

  // Upsert, а не create: якщо лист за цей період уже є іншою мовою — перезаписуємо його, інакше
  // унікальний ключ `(userId, period, periodKey)` дав би конфлікт при зміні мови.
  const row = await prisma.aiReflection.upsert({
    where: { userId_period_periodKey: { userId, period, periodKey: bounds.key } },
    create: {
      userId,
      period,
      periodKey: bounds.key,
      locale,
      addressForm: address,
      content: parsed,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    },
    update: {
      locale,
      addressForm: address,
      content: parsed,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    },
  });

  await consumeQuota(userId, today, result.inputTokens, result.outputTokens);
  audit("ai.reflection", {
    userId,
    period,
    cached: false,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });

  return {
    period,
    periodKey: row.periodKey,
    periodStart: bounds.from,
    periodEnd: bounds.to,
    locale,
    content: parsed,
    crisis: null,
    createdAt: row.createdAt.toISOString(),
    cached: false,
  };
}

/** Історія листів (кеш = архів). Без `content` — для списку достатньо заголовка. */
export async function listReflections(userId: string, period: AiPeriod, limit = 12) {
  const rows = await prisma.aiReflection.findMany({
    where: { userId, period },
    orderBy: { periodKey: "desc" },
    take: limit,
    select: { periodKey: true, locale: true, content: true, createdAt: true },
  });
  return rows.map((r) => {
    // Межі рахуємо з ключа: у рядку архіву дат немає, а клієнту потрібні саме дні.
    const bounds = periodKeyBounds(r.periodKey);
    return {
      periodKey: r.periodKey,
      periodStart: bounds.from,
      periodEnd: bounds.to,
      locale: r.locale,
      headline: (r.content as ReflectionContent).headline,
      createdAt: r.createdAt.toISOString(),
    };
  });
}
