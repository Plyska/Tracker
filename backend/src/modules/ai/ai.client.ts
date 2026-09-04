import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { env } from "../../env.js";
import { Errors } from "../../lib/errors.js";

/**
 * Шов провайдера LLM (ADR 0012, план §3.5).
 *
 * Решта модуля знає ЛИШЕ `AiProvider` — тож зміна провайдера це один файл, а не переписування.
 * Це не абстракція «на майбутнє»: ми свідомо стартуємо на безкоштовному тирі Gemini і плануємо
 * перейти на платний (або на Anthropic) — див. план §3.6.
 *
 * Навмисно вузько: одна операція `generateJson` (structured output). Стрімінг тексту для чату
 * додасться у фазі B2 окремим методом — не тягнемо його зараз, щоб не проєктувати наосліп.
 */

export interface GenerateJsonParams {
  system: string;
  /** Інструкція задачі + контекст-пак (уже відмежований як дані). */
  user: string;
  /** Чиста JSON Schema очікуваного результату. */
  schema: unknown;
  /** Стеля вихідних токенів — лист короткий, тримаємо жорстко. */
  maxOutputTokens: number;
  /** Нижче = дешевше й стисліше. Для листа достатньо мінімального. */
  effort?: "low" | "medium";
  signal?: AbortSignal;
}

export interface GenerateJsonResult {
  /** Сирий JSON-текст відповіді (валідацію робить викликач — ai.reflection). */
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  generateJson(params: GenerateJsonParams): Promise<GenerateJsonResult>;
}

// ── Стійкість до тимчасових збоїв провайдера ──────────────────────────────────────────────
const RETRY_DELAYS_MS = [800, 2400];

/**
 * Тимчасові збої — норма на безкоштовному тирі: «high demand» (503 UNAVAILABLE) і вичерпані
 * квоти сплеску (429 RESOURCE_EXHAUSTED) трапляються навіть за малого трафіку. Без ретраю
 * користувач бачив би випадкову помилку на першому ж кліку.
 * Постійні помилки (400 — погана схема/параметри) НЕ ретраїмо: вони не «розсмокчуться».
 */
const isTransient = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message : String(e);
  return /UNAVAILABLE|RESOURCE_EXHAUSTED|"code":\s*(429|500|502|503|504)|high demand|overloaded/i.test(
    msg,
  );
};

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= RETRY_DELAYS_MS.length || !isTransient(e)) {
        // Назовні — лише 503 без деталей: текст провайдера може містити внутрішні дані запиту.
        console.error(`[ai] provider call failed (attempt ${attempt + 1}):`, e);
        throw Errors.aiUnavailable();
      }
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
}

// ── Gemini ────────────────────────────────────────────────────────────────────────────────
// API-форма звірена з типами `@google/genai` 2.21.0 (не з пам'яті): `ai.models.generateContent`
// з `config.responseMimeType` + `config.responseJsonSchema`. Новий Interactions API навмисно
// не беремо — він snake_case і орієнтований на агентів/сесії, нам це зараз не потрібно.
class GeminiProvider implements AiProvider {
  readonly name = "gemini";
  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateJson(p: GenerateJsonParams): Promise<GenerateJsonResult> {
    const res = await withRetry(() =>
      this.client.models.generateContent({
        model: this.model,
        contents: p.user,
        config: {
          systemInstruction: p.system,
          responseMimeType: "application/json",
          responseJsonSchema: p.schema,
          maxOutputTokens: p.maxOutputTokens,
          // Низьке «мислення»: лист — це переказ уже готових чисел теплою мовою, а не задача на
          // ризонінг. Економить токени й латентність (користувач чекає на екрані).
          // MINIMAL свідомо НЕ використовуємо: Flash-моделі відхиляють його з 400.
          thinkingConfig: {
            thinkingLevel: p.effort === "medium" ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW,
          },
          abortSignal: p.signal,
        },
      }),
    );

    const text = res.text;
    const finish = res.candidates?.[0]?.finishReason;
    // MAX_TOKENS дає обрізаний (невалідний) JSON — краще явна 503, ніж падіння на JSON.parse
    // із незрозумілою помилкою. Решта нештатних причин (safety тощо) — так само.
    if (!text || (finish && finish !== "STOP")) {
      throw Errors.aiUnavailable(
        `Gemini returned no usable JSON (finishReason: ${finish ?? "none"})`,
      );
    }

    const usage = res.usageMetadata;
    return {
      text,
      model: res.modelVersion ?? this.model,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    };
  }
}

// ── Резолвер ──────────────────────────────────────────────────────────────────────────────
let cached: AiProvider | null = null;

/**
 * Активний провайдер (singleton). Немає ключа → `503 AI_UNAVAILABLE`: сервер має працювати без
 * AI (локальна розробка, деградація), тому це помилка запиту, а не падіння старту. У проді
 * відсутній ключ ловить guard в `env.ts` — тихий деплой без AI гірший за помітну помилку.
 */
export function getAiProvider(): AiProvider {
  if (cached) return cached;
  if (!env.aiApiKey) {
    throw Errors.aiUnavailable(
      `AI provider '${env.aiProvider}' has no API key configured`,
    );
  }
  if (env.aiProvider === "gemini") {
    cached = new GeminiProvider(env.aiApiKey, env.aiModel);
    return cached;
  }
  // Anthropic-реалізація — за потреби (план §3.5): той самий інтерфейс, `output_config.format`
  // для structured output, `cache_control` на system-блок.
  throw Errors.aiUnavailable(`AI provider '${env.aiProvider}' is not implemented yet`);
}

/** Чи налаштований AI взагалі (для `GET /ai/quota` та деградації UI без 503-помилок). */
export const isAiConfigured = (): boolean => Boolean(env.aiApiKey);
