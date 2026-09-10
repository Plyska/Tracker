import { GoogleGenAI, ThinkingLevel, type Content, type Part } from "@google/genai";
import { env } from "../../env.js";
import { Errors } from "../../lib/errors.js";

/**
 * Шов провайдера LLM (ADR 0012, план §3.5).
 *
 * Решта модуля знає ЛИШЕ `AiProvider` — тож зміна провайдера це один файл, а не переписування.
 * Це не абстракція «на майбутнє»: ми свідомо стартуємо на безкоштовному тирі Gemini і плануємо
 * перейти на платний (або на Anthropic) — див. план §3.6.
 *
 * Дві операції: `generateJson` (structured output — лист, чек-ін) і `streamChat` (фаза B2 —
 * потоковий текст + read-only інструменти). Більше нічого сюди не додаємо без потреби.
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
  /**
   * Температура семплінгу. Не задавати = дефолт провайдера (~1.0), і для листа це правильно:
   * він має звучати живо, а не однаково щотижня.
   *
   * А от там, де відповідь **перевірна** — класифікація, витяг фактів — випадковість не дає
   * нічого, крім розкиду. Заміряно на кризовому класифікаторі: та сама фраза («хочеться зникнути
   * на тиждень») на дефолтній температурі давала 2 хибних спрацювання з 8 прогонів, хоча
   * одиничний замір показував бездоганні 14/14. Один прогін на кейс просто не здатен побачити
   * такий розкид — саме тому запобіжник тепер іде з `temperature: 0`.
   */
  temperature?: number;
  signal?: AbortSignal;
}

export interface GenerateJsonResult {
  /** Сирий JSON-текст відповіді (валідацію робить викликач — ai.reflection). */
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

// ── Чат зі стрімінгом і інструментами (фаза B2) ───────────────────────────────────────────

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

/** Оголошення інструмента. `parameters` — чиста JSON Schema (провайдер-незалежна). */
export interface ToolSpec {
  name: string;
  description: string;
  parameters: unknown;
}

export interface ToolCall {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

/**
 * Події потоку. `tool` віддається назовні не заради виконання (його вже зробив `runTool`), а
 * заради спостережуваності: контролер шле подію клієнту («дивлюсь щоденник…») і пише в audit.
 */
export type ChatChunk =
  | { kind: "text"; delta: string }
  | { kind: "tool"; call: ToolCall }
  | {
      kind: "done";
      model: string;
      inputTokens: number;
      outputTokens: number;
      /** Причина зупинки останнього раунду: `STOP` — нормально, `MAX_TOKENS` — відповідь обрізано. */
      finishReason?: string;
    };

export interface StreamChatParams {
  system: string;
  /** Історія розмови. Не зберігається на сервері (ADR 0012) — приходить від клієнта щоразу. */
  turns: ChatTurn[];
  tools: ToolSpec[];
  maxOutputTokens: number;
  effort?: "low" | "medium";
  signal?: AbortSignal;
  /** Виконати інструмент і повернути результат моделі. Кидати не можна — помилку теж повертати. */
  runTool: (call: ToolCall) => Promise<Record<string, unknown>>;
  /** Стеля раундів «модель кличе інструмент → ми відповідаємо». Обмежує вартість і латентність. */
  maxToolRounds?: number;
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  generateJson(params: GenerateJsonParams): Promise<GenerateJsonResult>;
  streamChat(params: StreamChatParams): AsyncGenerator<ChatChunk>;
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
  // `HTTP NNN` — форма OpenAI-сумісних провайдерів (див. `OpenAiCompatibleProvider`, який кладе
  // статус у текст помилки); решта патернів — форми Gemini.
  return /UNAVAILABLE|RESOURCE_EXHAUSTED|"code":\s*(429|500|502|503|504)|HTTP (429|500|502|503|504)|high demand|overloaded/i.test(
    msg,
  );
};

/**
 * Скільки максимум чекаємо, коли провайдер САМ назвав паузу. Хвилинне вікно за цей час реально
 * поповнюється, тож очікування продуктивне — на відміну від добової квоти (нижче).
 */
const MAX_WAIT_MS = 25_000;

/** Провайдер сам каже, коли пробувати знову: Gemini — `retryDelay` у тілі, OpenAI-сумісні — заголовок. */
const retryAfterMs = (e: unknown): number | null => {
  const msg = e instanceof Error ? e.message : String(e);
  const m =
    /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(msg) ??
    /retry-after[:=]\s*(\d+(?:\.\d+)?)/i.exec(msg);
  return m ? Number(m[1]) * 1000 : null;
};

/**
 * Добова квота — принципово інший випадок за хвилинну: чекати немає сенсу, вона не поповниться
 * ні за 18 секунд, ні за хвилину. Пастка в тому, що провайдер і тут присилає `retryDelay` (~31 с)
 * і цим фактично бреше, тож розрізняємо за текстом, а не за паузою.
 */
const isDailyQuota = (e: unknown): boolean =>
  /PerDay|per day|\bRPD\b|\bTPD\b|daily/i.test(e instanceof Error ? e.message : String(e));

/**
 * Чому саме впало — у ЛОГ (назовні йде глухий 503: текст провайдера містить деталі запиту).
 * Патерни обох словників: Gemini каже `PerDay`/`RESOURCE_EXHAUSTED`, OpenAI-сумісні —
 * `rate_limit_exceeded` і «tokens per minute (TPM)». Без другої половини Groq-помилки падали в
 * «непередбачений збій», тобто рівно в те, від чого ця функція мала рятувати.
 */
const diagnose = (e: unknown): string => {
  const msg = e instanceof Error ? e.message : String(e);
  if (isDailyQuota(e)) return "добова квота вичерпана — чекати марно, потрібна інша модель або тир";
  if (/tokens per minute|\bTPM\b/i.test(msg)) return "ліміт ТОКЕНІВ за хвилину — мине саме";
  if (/requests per minute|\bRPM\b|PerMinute/i.test(msg)) return "ліміт ЗАПИТІВ за хвилину — мине саме";
  if (/rate.?limit|RESOURCE_EXHAUSTED|HTTP 429/i.test(msg)) return "ліміт частоти — мине саме";
  if (/high demand|overloaded|UNAVAILABLE|HTTP 50\d/i.test(msg)) return "провайдер перевантажений";
  return "непередбачений збій провайдера";
};

/**
 * Ретрай тимчасових збоїв.
 *
 * Ключове розрізнення (спершу зроблене неправильно): коли провайдер називає паузу, вона може
 * означати дві різні речі. **Хвилинне вікно** поповнюється саме — почекати 18 секунд і відповісти
 * набагато краще, ніж миттєвий 503 і тост «спробуйте пізніше»; людина в чаті все одно чекає.
 * **Добова квота** не поповниться скільки не чекай — там єдина чесна відповідь це помилка.
 *
 * Тому пауза з відповіді поважається до `MAX_WAIT_MS`, але ніколи — для добової квоти.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const askedFor = retryAfterMs(e);
      // Провайдер назвав паузу → чекаємо саме її (у межах стелі); ні — беремо власний бекоф.
      const wait = askedFor ?? RETRY_DELAYS_MS[attempt];
      const worthRetrying =
        attempt < RETRY_DELAYS_MS.length &&
        isTransient(e) &&
        !isDailyQuota(e) &&
        wait !== undefined &&
        wait <= MAX_WAIT_MS;

      if (!worthRetrying) {
        // Назовні — лише 503 без деталей: текст провайдера може містити внутрішні дані запиту.
        console.error(`[ai] provider call failed (attempt ${attempt + 1}) — ${diagnose(e)}:`, e);
        throw Errors.aiUnavailable();
      }
      console.warn(`[ai] ${diagnose(e)}; чекаю ${Math.round(wait / 1000)}с і пробую знову`);
      await new Promise((r) => setTimeout(r, wait));
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
          ...(p.temperature !== undefined && { temperature: p.temperature }),
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
      // `thoughtsTokenCount` — ОКРЕМИЙ лічильник: «мислення» не входить у `candidatesTokenCount`,
      // хоча витрачає той самий бюджет `maxOutputTokens` і на платному тирі оплачується як вихід.
      // Без нього облік занижений у рази (заміряно: 956 токенів мислення проти 40 видимих).
      outputTokens: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
    };
  }

  /**
   * Потоковий чат із tool-loop. Історію ведемо ЛОКАЛЬНО в `contents`: кожен раунд дописуємо
   * відповідь моделі (з `functionCall`) і наш `functionResponse`, після чого просимо продовжити.
   *
   * `withRetry` обгортає лише **отримання генератора**: ретрай після того, як частина тексту вже
   * пішла клієнту, продублював би її на екрані. Збій посеред потоку — це помилка, не ретрай.
   */
  async *streamChat(p: StreamChatParams): AsyncGenerator<ChatChunk> {
    const contents: Content[] = p.turns.map((t) => ({
      role: t.role,
      parts: [{ text: t.text }],
    }));
    const functionDeclarations = p.tools.map((t) => ({
      name: t.name,
      description: t.description,
      parametersJsonSchema: t.parameters,
    }));

    let inputTokens = 0;
    let outputTokens = 0;
    let model = this.model;
    let finishReason: string | undefined;
    const maxRounds = p.maxToolRounds ?? 3;
    let budgetAnnounced = false;

    for (let round = 0; ; round++) {
      const stream = await withRetry(() =>
        this.client.models.generateContentStream({
          model: this.model,
          contents,
          config: {
            systemInstruction: p.system,
            ...(functionDeclarations.length > 0 ? { tools: [{ functionDeclarations }] } : {}),
            maxOutputTokens: p.maxOutputTokens,
            // Рівень «мислення» тут — не про якість, а про баланс: воно ділить бюджет
            // `maxOutputTokens` із самою відповіддю й додає секунди очікування (заміряно:
            // MEDIUM ≈ 1600 токенів і 86 с проти LOW ≈ 500 і 42 с — при однаковій якості
            // відповіді й тому самому правильному виборі інструмента).
            thinkingConfig: {
              thinkingLevel: p.effort === "medium" ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW,
            },
            abortSignal: p.signal,
          },
        }),
      );

      const calls: ToolCall[] = [];
      // Частини відповіді збираємо ЯК Є, а не перезбираємо з `functionCalls`: у `functionCall`
      // частинах їде `thoughtSignature`, і Gemini вимагає повернути його дослівно наступним
      // запитом (інакше 400 «Function call is missing a thought_signature»).
      const modelParts: Part[] = [];

      for await (const chunk of stream) {
        const delta = chunk.text;
        if (delta) yield { kind: "text", delta };
        for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
          modelParts.push(part);
          const c = part.functionCall;
          if (c?.name) calls.push({ id: c.id, name: c.name, args: c.args ?? {} });
        }
        const usage = chunk.usageMetadata;
        if (usage) {
          // Кожен чанк несе кумулятивний лічильник за цей виклик — беремо максимум, а не суму.
          inputTokens = Math.max(inputTokens, usage.promptTokenCount ?? 0);
          // Разом із «мисленням»: воно не входить у `candidatesTokenCount`, але їсть той самий
          // бюджет `maxOutputTokens` — і саме воно з'їдало відповідь (див. CHAT_MAX_OUTPUT_TOKENS).
          outputTokens = Math.max(
            outputTokens,
            (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0),
          );
        }
        // Причина завершення потрібна назовні: `MAX_TOKENS` означає обрізану (може й порожню)
        // відповідь, і мовчки віддати таке за повноцінний хід — гірше, ніж сказати про збій.
        const reason = chunk.candidates?.[0]?.finishReason;
        if (reason) finishReason = reason;
        if (chunk.modelVersion) model = chunk.modelVersion;
      }

      if (calls.length === 0) break;

      // Стеля раундів: далі не кличемо інструменти, але даємо моделі шанс відповісти словами —
      // інакше людина побачила б обірваний хід без жодного тексту. Кажемо це РІВНО раз: якщо
      // модель і після цього наполягає на інструментах, виходимо, інакше цикл нескінченний.
      if (round >= maxRounds) {
        if (budgetAnnounced) break;
        budgetAnnounced = true;
        contents.push({ role: "model", parts: modelParts });
        contents.push({
          role: "user",
          parts: calls.map((c) => ({
            functionResponse: {
              id: c.id,
              name: c.name,
              response: { error: "Tool budget exhausted. Answer with what you already know." },
            },
          })),
        });
        continue;
      }

      // Спершу анонсуємо виклик, потім виконуємо: клієнт встигає показати «дивлюсь щоденник…»,
      // поки запит до БД триває, замість мовчазної паузи в потоці.
      for (const c of calls) yield { kind: "tool", call: c };

      const responses = await Promise.all(
        calls.map(async (c) => {
          try {
            return await p.runTool(c);
          } catch (e) {
            // Помилку інструмента віддаємо МОДЕЛІ, а не рвемо потік: вона перепитає або
            // відповість без цих даних, і людина отримає осмислену репліку замість 500.
            console.error(`[ai] tool '${c.name}' failed:`, e);
            return { error: "Tool failed" };
          }
        }),
      );

      contents.push({
        role: "model",
        parts: modelParts,
      });
      contents.push({
        role: "user",
        parts: calls.map((c, i) => ({
          functionResponse: { id: c.id, name: c.name, response: responses[i] },
        })),
      });
    }

    yield { kind: "done", model, inputTokens, outputTokens, finishReason };
  }
}

// ── OpenAI-сумісний провайдер (Groq і будь-хто з тим самим API) ───────────────────────────

/** Мінімальні форми відповідей — рівно те, що ми читаємо (звірено живими запитами). */
interface ChatCompletionUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}
interface StreamToolCall {
  index: number;
  id?: string;
  function?: { name?: string; arguments?: string };
}
interface StreamEvent {
  model?: string;
  usage?: ChatCompletionUsage;
  choices?: {
    finish_reason?: string | null;
    delta?: { content?: string; tool_calls?: StreamToolCall[] };
  }[];
}
interface CompletionResponse {
  model?: string;
  usage?: ChatCompletionUsage;
  choices?: { finish_reason?: string | null; message?: { content?: string | null } }[];
}

/** Розбір SSE-потоку в події. Кадр — рядок `data: {...}`; `[DONE]` завершує. */
async function* parseSseStream(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        yield JSON.parse(payload) as StreamEvent;
      } catch {
        /* неповний або службовий кадр — пропускаємо */
      }
    }
  }
}

/**
 * Реалізація для OpenAI-сумісного API — Groq, а за потреби Cerebras чи OpenRouter: вони
 * відрізняються лише базовим URL і назвою моделі (`AI_BASE_URL` / `AI_MODEL`), не формою запитів.
 *
 * Свідомо на голому `fetch`, без SDK: потрібні рівно два виклики одного ендпоінта, а форми
 * відповідей звірено живими запитами. Зайва залежність коштувала б більше, ніж економила.
 *
 * **`delta.reasoning` НЕ віддаємо назовні.** Провайдер стрімить роздуми моделі окремим полем від
 * `delta.content`; сплутати їх — означає вивалити користувачу внутрішню кухню замість відповіді.
 */
class OpenAiCompatibleProvider implements AiProvider {
  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly baseUrl: string,
    readonly name: string,
  ) {}

  private async post(body: unknown, signal?: AbortSignal): Promise<Response> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      // Статус — у текст помилки: саме по ньому `withRetry` відрізняє тимчасовий збій від
      // постійного, а `retry-after` вирішує, чи ретрай узагалі має сенс.
      const detail = await res.text().catch(() => "");
      const retryAfter = res.headers.get("retry-after");
      throw new Error(
        `HTTP ${res.status}` +
          (retryAfter ? ` retry-after: ${retryAfter}` : "") +
          ` ${detail.slice(0, 500)}`,
      );
    }
    return res;
  }

  /** Наш `effort` → `reasoning_effort`. Заміряно: low ≈ 10 токенів роздумів, high ≈ 1400. */
  private reasoning(effort?: "low" | "medium"): string {
    return effort === "medium" ? "medium" : "low";
  }

  async generateJson(p: GenerateJsonParams): Promise<GenerateJsonResult> {
    const res = await withRetry(() =>
      this.post(
        {
          model: this.model,
          max_completion_tokens: p.maxOutputTokens,
          reasoning_effort: this.reasoning(p.effort),
          ...(p.temperature !== undefined && { temperature: p.temperature }),
          messages: [
            { role: "system", content: p.system },
            { role: "user", content: p.user },
          ],
          // Без `strict: true`: у строгому режимі провайдер вимагає, щоб КОЖНЕ поле було в
          // `required` і стояв `additionalProperties: false`, а наші схеми навмисно мають
          // необов'язкові поля. JSON за схемою він віддає й так, а валідація в нас своя (zod).
          response_format: {
            type: "json_schema",
            json_schema: { name: "result", schema: p.schema },
          },
        },
        p.signal,
      ),
    );

    const data = (await res.json()) as CompletionResponse;
    const choice = data.choices?.[0];
    const text = choice?.message?.content ?? "";
    const finish = choice?.finish_reason;
    // Обрізаний JSON не розпарситься — краще явна 503, ніж падіння на JSON.parse.
    if (!text || (finish && finish !== "stop")) {
      // Причина в логи: `length` означає «стеля затісна», і без цього рядка вона виглядає
      // знадвору як звичайна недоступність провайдера. Контенту тут немає — лише лічильники.
      console.error(
        `[ai] no usable JSON: finish_reason=${finish ?? "none"} prompt=${data.usage?.prompt_tokens ?? "?"} completion=${data.usage?.completion_tokens ?? "?"} cap=${p.maxOutputTokens}`,
      );
      throw Errors.aiUnavailable(`Provider returned no usable JSON (finish_reason: ${finish ?? "none"})`);
    }
    return {
      text,
      model: data.model ?? this.model,
      inputTokens: data.usage?.prompt_tokens ?? 0,
      // `completion_tokens` тут уже включає токени роздумів (звірено: 1472 при 1401 reasoning).
      outputTokens: data.usage?.completion_tokens ?? 0,
    };
  }

  async *streamChat(p: StreamChatParams): AsyncGenerator<ChatChunk> {
    const messages: unknown[] = [
      { role: "system", content: p.system },
      ...p.turns.map((t) => ({
        role: t.role === "model" ? "assistant" : "user",
        content: t.text,
      })),
    ];
    const tools = p.tools.map((t) => ({
      type: "function",
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));

    let inputTokens = 0;
    let outputTokens = 0;
    let model = this.model;
    let finishReason: string | undefined;
    const maxRounds = p.maxToolRounds ?? 3;
    let budgetAnnounced = false;

    for (let round = 0; ; round++) {
      const res = await withRetry(() =>
        this.post(
          {
            model: this.model,
            max_completion_tokens: p.maxOutputTokens,
            reasoning_effort: this.reasoning(p.effort),
            stream: true,
            // Без цього у потоці не буде `usage` — і квота списувалась би по нулях.
            stream_options: { include_usage: true },
            messages,
            ...(tools.length > 0 ? { tools } : {}),
          },
          p.signal,
        ),
      );
      if (!res.body) throw Errors.aiUnavailable("Provider returned an empty stream");

      // Аргументи інструмента можуть приїхати кількома дельтами — збираємо за `index`.
      const calls = new Map<number, { id?: string; name: string; args: string }>();
      let text = "";

      for await (const evt of parseSseStream(res.body)) {
        const choice = evt.choices?.[0];
        const delta = choice?.delta;
        if (delta?.content) {
          text += delta.content;
          yield { kind: "text", delta: delta.content };
        }
        for (const tc of delta?.tool_calls ?? []) {
          const cur = calls.get(tc.index) ?? { name: "", args: "" };
          if (tc.id) cur.id = tc.id;
          if (tc.function?.name) cur.name = tc.function.name;
          if (tc.function?.arguments) cur.args += tc.function.arguments;
          calls.set(tc.index, cur);
        }
        if (choice?.finish_reason) finishReason = choice.finish_reason;
        if (evt.usage) {
          inputTokens = Math.max(inputTokens, evt.usage.prompt_tokens ?? 0);
          outputTokens = Math.max(outputTokens, evt.usage.completion_tokens ?? 0);
        }
        if (evt.model) model = evt.model;
      }

      const pending = [...calls.entries()].filter(([, c]) => c.name);
      if (pending.length === 0) break;

      const assistantTurn = {
        role: "assistant",
        content: text || null,
        tool_calls: pending.map(([i, c]) => ({
          id: c.id ?? `call_${i}`,
          type: "function",
          function: { name: c.name, arguments: c.args || "{}" },
        })),
      };

      // Стеля раундів: один раз кажемо моделі закруглятись, і якщо вона все одно кличе
      // інструменти — виходимо. Без цього другого запобіжника цикл був би нескінченним.
      if (round >= maxRounds) {
        if (budgetAnnounced) break;
        budgetAnnounced = true;
        messages.push(assistantTurn);
        for (const [i, c] of pending) {
          messages.push({
            role: "tool",
            tool_call_id: c.id ?? `call_${i}`,
            content: JSON.stringify({ error: "Tool budget exhausted. Answer with what you know." }),
          });
        }
        continue;
      }

      for (const [i, c] of pending) {
        yield {
          kind: "tool",
          call: { id: c.id ?? `call_${i}`, name: c.name, args: safeArgs(c.args) },
        };
      }

      const results = await Promise.all(
        pending.map(async ([, c]) => {
          try {
            return await p.runTool({ id: c.id, name: c.name, args: safeArgs(c.args) });
          } catch (e) {
            console.error(`[ai] tool '${c.name}' failed:`, e);
            return { error: "Tool failed" };
          }
        }),
      );

      messages.push(assistantTurn);
      pending.forEach(([i, c], n) => {
        messages.push({
          role: "tool",
          tool_call_id: c.id ?? `call_${i}`,
          content: JSON.stringify(results[n]),
        });
      });
    }

    yield { kind: "done", model, inputTokens, outputTokens, finishReason };
  }
}

/** Аргументи інструмента приходять рядком; зіпсований JSON — не привід рвати розмову. */
function safeArgs(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
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
  if (env.aiBaseUrl) {
    cached = new OpenAiCompatibleProvider(
      env.aiApiKey,
      env.aiModel,
      env.aiBaseUrl,
      env.aiProvider,
    );
    return cached;
  }
  // Anthropic-реалізація — за потреби (план §3.5): той самий інтерфейс, `output_config.format`
  // для structured output, `cache_control` на system-блок.
  throw Errors.aiUnavailable(`AI provider '${env.aiProvider}' is not implemented yet`);
}

/** Чи налаштований AI взагалі (для `GET /ai/quota` та деградації UI без 503-помилок). */
export const isAiConfigured = (): boolean => Boolean(env.aiApiKey);
