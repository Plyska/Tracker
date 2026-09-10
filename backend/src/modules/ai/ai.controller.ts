import type { Request, Response } from "express";
import { prisma } from "../../prisma.js";
import { audit } from "../../lib/audit.js";
import { AppError, Errors } from "../../lib/errors.js";
import { computeInsights } from "./ai.insights.js";
import { getOrCreateReflection, listReflections } from "./ai.reflection.js";
import { buildCheckinContext, parseCheckin, validateProposal } from "./ai.checkin.js";
import {
  CHAT_MAX_OUTPUT_TOKENS,
  CHAT_OVERVIEW_DAYS,
  CHAT_TOOLS,
  buildChatInstruction,
  overviewFor,
  runChatTool,
  type ChatToolContext,
} from "./ai.chat.js";
import { buildSystemPrompt, toAddressForm, USER_DATA_TAG } from "./ai.prompts.js";
import { assertQuota, consumeQuota, getQuota } from "./ai.quota.js";
import { getAiProvider, isAiConfigured } from "./ai.client.js";
import { addDaysISO } from "./ai.dates.js";
import type {
  ChatBody,
  CheckinBody,
  InsightsQuery,
  QuotaQuery,
  ReflectionBody,
  ReflectionsQuery,
} from "./ai.schema.js";

/**
 * Гейт AI: фіча вимкнена, поки користувач не пройшов екран згоди (ADR 0012).
 * Повертає налаштування, бо далі потрібні `aiDiaryOptIn` (контекст) і `aiAddressForm` (рід у
 * звертанні — його читають УСІ три поверхні, тож дістаємо тут, а не в кожній окремо).
 */
async function requireAiEnabled(userId: string) {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { aiEnabled: true, aiDiaryOptIn: true, locale: true, aiAddressForm: true },
  });
  if (!prefs?.aiEnabled) throw Errors.aiDisabled();
  return prefs;
}

/**
 * GET /ai/insights?today= — підказки-патерни (без LLM).
 *
 * Свідомо БЕЗ гейту `aiEnabled`: нічого не покидає нашу БД (чиста математика над даними
 * користувача), а картка на Dashboard — це «двері» до помічника: CTA «обговорити» веде через
 * екран згоди. Не аудитимо — викликається на кожному відкритті Dashboard і нічого не коштує.
 */
export const getInsights = async (req: Request, res: Response): Promise<void> => {
  const { today } = req.query as unknown as InsightsQuery;
  res.json(await computeInsights(req.userId!, today));
};

/**
 * POST /ai/reflection — лист за період: з кешу або генерація.
 * Порядок перевірок навмисний: згода → квота → генерація. Квоту списуємо лише після успіху
 * (див. ai.quota), а кешований лист її взагалі не витрачає.
 */
export const postReflection = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { period, today, locale } = req.body as ReflectionBody;
  const prefs = await requireAiEnabled(userId);

  await assertQuota(userId, today);
  const result = await getOrCreateReflection(
    userId,
    period,
    today,
    locale,
    prefs.aiDiaryOptIn === true,
    toAddressForm(prefs.aiAddressForm),
  );
  res.json(result);
};

/**
 * POST /ai/checkin — розбір тексту на дії (фаза B1).
 *
 * Нічого не пише: повертає ПРОПОЗИЦІЮ, яку клієнт застосовує через уже наявні
 * `PUT /entries`, `PUT /daily-logs`, `POST /tasks` після підтвердження картки. Тож і `aiDiaryOptIn`
 * тут не потрібен — щоденник людина сама щойно надиктувала, ми не читаємо старих записів.
 */
export const postCheckin = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { text, today, locale, intent } = req.body as CheckinBody;
  const prefs = await requireAiEnabled(userId);

  await assertQuota(userId, today);
  res.json(
    await parseCheckin(userId, text, today, locale, intent, toAddressForm(prefs.aiAddressForm)),
  );
};

/**
 * POST /ai/chat — розмова потоком (SSE, фаза B2).
 *
 * Чому не RTK Query: `httpBaseQuery` не стрімить. Клієнт читає це через `fetch` +
 * `ReadableStream` (план §5.2), тому формат подій тут — контракт, а не деталь.
 *
 * Порядок навмисний: усі перевірки (згода, квота, наявність провайдера, збір контексту) — ДО
 * `writeHead`. Після відкриття потоку код 200 уже відправлено, і повернути 429 чи 503 неможливо:
 * лишається подія `error`, яку клієнт мусить показати сам.
 */
export const postChat = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { messages, today, locale, seed } = req.body as ChatBody;
  const prefs = await requireAiEnabled(userId);
  await assertQuota(userId, today);

  const provider = getAiProvider();
  const [checkinCtx, overview] = await Promise.all([
    buildCheckinContext(userId, today),
    overviewFor(userId, addDaysISO(today, -(CHAT_OVERVIEW_DAYS - 1)), today),
  ]);

  const toolCtx: ChatToolContext = {
    userId,
    today,
    diaryOptIn: prefs.aiDiaryOptIn === true,
    proposal: null,
  };

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // Вимикає буферизацію на проксі (nginx та подібні) — інакше потік доїде «одним шматком»
    // наприкінці, і весь сенс стрімінгу зникне.
    "X-Accel-Buffering": "no",
  });
  const send = (event: string, data: unknown): void => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Людина закрила вкладку чи натиснула «стоп» — обриваємо виклик до провайдера, а не
  // догенеровуємо у порожнечу за її ж квоту.
  const abort = new AbortController();
  res.on("close", () => abort.abort());

  // Контекст чіпляємо до ОСТАННЬОГО повідомлення, а не до першого: у довгій розмові дані з
  // першого ходу вже застарілі (людина щойно щось відмітила), а тут вони завжди свіжі.
  const turns = messages.map((m, i) =>
    i < messages.length - 1
      ? m
      : {
          role: m.role,
          text: [
            buildChatInstruction(locale, today),
            `<${USER_DATA_TAG}>`,
            `<overview>\n${JSON.stringify(overview)}\n</overview>`,
            `<habits_and_week>\n${JSON.stringify(checkinCtx)}\n</habits_and_week>`,
            seed ? `<opened_from>${seed.type}:${seed.key}</opened_from>` : "",
            `<user_message>\n${m.text}\n</user_message>`,
            `</${USER_DATA_TAG}>`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
  );

  let usage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    finishReason?: string;
  } = { model: provider.model, inputTokens: 0, outputTokens: 0 };
  // Чи сказала модель хоч слово. Порожній хід — не теоретичний випадок: «мислення» ділить бюджет
  // із відповіддю й може з'їсти його весь (див. CHAT_MAX_OUTPUT_TOKENS).
  let sawText = false;
  try {
    for await (const chunk of provider.streamChat({
      system: buildSystemPrompt(locale, "chat", toAddressForm(prefs.aiAddressForm)),
      turns,
      tools: CHAT_TOOLS,
      maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
      // План передбачав "medium", але замір це не підтвердив: MEDIUM удвічі повільніший (86 с
      // проти 42) і втричі дорожчий за токенами, а відповідь та сама — і навіть багатоходовий
      // випадок із `get_overview` за минулий місяць LOW відпрацьовує правильно. У розмові
      // зайві 40 секунд тиші коштують дорожче за будь-яку теоретичну глибину.
      effort: "low",
      signal: abort.signal,
      runTool: (call) => runChatTool(call, toolCtx),
    })) {
      if (chunk.kind === "text") {
        sawText = true;
        send("text", { delta: chunk.delta });
      }
      // Назву інструмента показуємо («дивлюсь щоденник…»), аргументи — ні: вони нецікаві
      // і можуть містити дати, які людина не питала.
      else if (chunk.kind === "tool") send("tool", { name: chunk.call.name });
      else usage = chunk;
    }

    // Пропозиція проходить ТУ САМУ валідацію, що чек-ін (спільний `validateProposal`), тож чат
    // не може обійти правила, які чек-ін дотримує: вікно тижня, чужі id, дублі.
    if (toolCtx.proposal) {
      const { actions, rejected } = validateProposal(toolCtx.proposal.actions, checkinCtx);
      send("proposal", {
        actions,
        rejected,
        context: {
          today: checkinCtx.today,
          weekStart: checkinCtx.weekStart,
          weekEnd: checkinCtx.weekEnd,
        },
      });
    }

    await consumeQuota(userId, today, usage.inputTokens, usage.outputTokens);
    audit("ai.chat", {
      userId,
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      finishReason: usage.finishReason,
    });

    // Хід без жодного слова (і без картки) — для людини це «чат мовчить», найгірший з можливих
    // станів: незрозуміло, чи зламалось, чи ще думає. Кажемо прямо, що відповіді не буде.
    // Квоту при цьому вже списано свідомо: провайдер відпрацював і токени витрачені.
    if (!sawText && !toolCtx.proposal) {
      console.error(`[ai] chat produced no text (finishReason: ${usage.finishReason ?? "none"})`);
      send("error", { code: "AI_UNAVAILABLE" });
    }

    send("done", { usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens } });
  } catch (e) {
    // Потік уже відкрито (200), тож звичайний errorHandler недосяжний — код помилки їде подією.
    console.error("[ai] chat stream failed:", e);
    const code = e instanceof AppError ? e.code : "AI_UNAVAILABLE";
    if (!res.writableEnded) send("error", { code });
  } finally {
    if (!res.writableEnded) res.end();
  }
};

/** GET /ai/reflections?period= — історія (заголовки минулих листів). */
export const getReflections = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  await requireAiEnabled(userId);
  const { period } = req.query as unknown as ReflectionsQuery;
  res.json(await listReflections(userId, period));
};

/** GET /ai/quota?today= — скільки лишилось на сьогодні (+ чи налаштований провайдер). */
export const getAiQuota = async (req: Request, res: Response): Promise<void> => {
  const { today } = req.query as unknown as QuotaQuery;
  const quota = await getQuota(req.userId!, today);
  res.json({ ...quota, configured: isAiConfigured() });
};

/**
 * GET /ai/data — експорт усього AI-шару користувача (GDPR-готовність, ADR 0012).
 * `AiReflection.content` чутливий (може переказувати щоденник) — тому це окремий явний запит,
 * а не частина загального експорту.
 */
export const exportAiData = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const [reflections, usage] = await Promise.all([
    prisma.aiReflection.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        period: true,
        periodKey: true,
        locale: true,
        content: true,
        model: true,
        createdAt: true,
      },
    }),
    prisma.aiUsage.findMany({ where: { userId }, orderBy: { day: "desc" } }),
  ]);
  audit("ai.data.export", { userId });
  res.json({ reflections, usage });
};

/**
 * DELETE /ai/data — видалити AI-**вміст** користувача (згенеровані листи).
 *
 * `AiUsage` свідомо НЕ чіпаємо, хоч раніше чіпали: це лічильник денної квоти, і його видалення
 * було прямим її обходом — «видалити дані» повертало повний ліміт, скільки завгодно разів на день.
 * На безкоштовному тирі це ще й спалювало б спільну квоту всього проєкту.
 *
 * Компроміс «лишати тільки сьогоднішній рядок» не працює: день у `AiUsage` — ЛОКАЛЬНА дата
 * клієнта, тобто клієнт сам казав би нам, який рядок пощадити, і збрехав би. Тому лічильники
 * лишаються цілком — це метрика тарифікації, а не вміст: листів, тексту чи щоденника в ній немає,
 * лише кількість запитів і токенів за день.
 */
export const deleteAiData = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const reflections = await prisma.aiReflection.deleteMany({ where: { userId } });
  audit("ai.data.delete", { userId });
  res.json({ deletedReflections: reflections.count });
};
