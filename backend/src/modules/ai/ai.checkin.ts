import { z } from "zod";
import { prisma } from "../../prisma.js";
import { audit } from "../../lib/audit.js";
import { Errors } from "../../lib/errors.js";
import { getAiProvider } from "./ai.client.js";
import {
  buildCheckinInstruction,
  buildSystemPrompt,
  USER_DATA_TAG,
  type AiLocale,
} from "./ai.prompts.js";
import { consumeQuota } from "./ai.quota.js";
import { addDaysISO, dowMon0, isISODate } from "./ai.dates.js";

/**
 * Щоденний чек-ін природною мовою (фаза B1, ADR 0012 п. 7).
 *
 * «бігав 30 хв, читав, медитацію пропустив, настрій так собі» → структуровані ДІЇ.
 *
 * Незмінне правило: **модель нічого не пише в БД**. Тут лише розбір і валідація; запис робить
 * клієнт після підтвердження картки, через уже наявні `PUT /entries`, `PUT /daily-logs`,
 * `POST /tasks`. Тому цей модуль не має жодного `prisma.*.create/update`.
 *
 * Парсинг консервативний: беремо лише явно сказане. Сумнів (яка саме навичка?) → `clarifications`,
 * а не здогад — хибна відмітка коштує довіри дорожче за одне уточнення.
 */

const MAX_OUTPUT_TOKENS = 1200;
const MINUTES_MAX = 1440; // 24 год/день — та сама межа, що в entry.schema
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/; // 'HH:mm' без TZ (ADR 0009), як у task.schema

// ── Схема відповіді моделі ────────────────────────────────────────────────────────────────
// Дискримінований union: кожна дія має свій набір полів. Валідація тут — перший бар'єр
// (структура), другий — `validateActions` нижче (реальність: чи існує навичка, чи дата в вікні).

const entryAction = z.object({
  type: z.literal("entry"),
  habitId: z.string().min(1),
  date: z.string(),
  done: z.boolean(),
  minutes: z.number().int().min(0).max(MINUTES_MAX).nullable(),
});
const moodAction = z.object({
  type: z.literal("mood"),
  date: z.string(),
  value: z.number().int().min(1).max(5),
});
const diaryAction = z.object({
  type: z.literal("diary"),
  date: z.string(),
  text: z.string().min(1).max(4000),
});
const taskAction = z.object({
  type: z.literal("task"),
  date: z.string().nullable(),
  title: z.string().min(1).max(200),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  habitId: z.string().nullable(),
});

export const checkinResultSchema = z.object({
  actions: z.array(z.discriminatedUnion("type", [entryAction, moodAction, diaryAction, taskAction])).max(12),
  clarifications: z
    .array(
      z.object({
        field: z.string().min(1).max(80),
        question: z.string().min(1).max(200),
        options: z.array(z.string().min(1).max(80)).max(6),
      }),
    )
    .max(3),
  reply: z.string().min(1).max(600),
});

export type CheckinAction = z.infer<typeof checkinResultSchema>["actions"][number];
export type CheckinResult = z.infer<typeof checkinResultSchema>;

/**
 * JSON Schema для провайдера. Провайдери підтримують лише підмножину JSON Schema, і
 * `oneOf`/дискриміновані union'и серед ненадійних — тому описуємо ПЛОСКИЙ об'єкт із
 * необов'язковими полями, а розрізняємо за `type`. Zod вище доводить його до строгих типів.
 */
const CHECKIN_JSON_SCHEMA = {
  type: "object",
  properties: {
    actions: {
      type: "array",
      maxItems: 12,
      description:
        "Structured actions extracted from the text. Only what the user explicitly said.",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["entry", "mood", "diary", "task"] },
          habitId: {
            type: ["string", "null"],
            description: "For 'entry': copy verbatim from context.habits[].id. Else null.",
          },
          date: {
            type: ["string", "null"],
            description: "YYYY-MM-DD. Defaults to context.today. Null only for an undated task.",
          },
          done: { type: ["boolean", "null"], description: "For 'entry': was it done." },
          minutes: {
            type: ["integer", "null"],
            description: "For 'entry' on a timed habit: minutes spent, 0-1440. Else null.",
          },
          value: { type: ["integer", "null"], description: "For 'mood': 1-5. Else null." },
          text: { type: ["string", "null"], description: "For 'diary': the entry text. Else null." },
          title: { type: ["string", "null"], description: "For 'task': the task title. Else null." },
          startTime: { type: ["string", "null"], description: "For 'task': 'HH:mm' or null." },
          endTime: { type: ["string", "null"], description: "For 'task': 'HH:mm' or null." },
        },
        required: ["type"],
      },
    },
    clarifications: {
      type: "array",
      maxItems: 3,
      description: "Ask instead of guessing when something is ambiguous.",
      items: {
        type: "object",
        properties: {
          field: { type: "string" },
          question: { type: "string" },
          options: { type: "array", items: { type: "string" }, maxItems: 6 },
        },
        required: ["field", "question", "options"],
      },
    },
    reply: {
      type: "string",
      description: "One or two warm sentences reacting to what the user said.",
    },
  },
  required: ["actions", "clarifications", "reply"],
} as const;

export interface CheckinContext {
  habits: { id: string; name: string; kind: "daily" | "count" | "timed" }[];
  /**
   * Уже наявні відмітки/настрій за дні тижня — щоб не пропонувати дубль, а для часових звичок
   * знати, до чого додавати: `PUT /entries` **замінює** хвилини, не додає, тож без цього
   * «пограв ще годину» перетворило б 30 хв на 60 замість 90.
   */
  existing: {
    date: string;
    done: { habitId: string; minutes: number | null }[];
    mood: number | null;
    hasNotes: boolean;
  }[];
  today: string;
  weekStart: string;
  weekEnd: string;
}

/** Дії, відкинуті валідацією — клієнт показує їх як пояснення, а не тихо ковтає. */
export interface RejectedAction {
  reason: "outsideWeek" | "unknownHabit" | "futureDate" | "invalidShape" | "duplicate";
  detail: string;
}

/**
 * Дія + те, що сервер знає, а модель ні: `prevMinutes` — скільки вже записано за цей день.
 * Картка підтвердження показує «30 → 90 хв», щоб заміна була видима, а не тихою.
 */
export type ProposedAction = CheckinAction & { prevMinutes?: number | null };

export interface CheckinResponse extends Omit<CheckinResult, "actions"> {
  actions: ProposedAction[];
  rejected: RejectedAction[];
  context: { today: string; weekStart: string; weekEnd: string };
}

/**
 * Другий бар'єр валідації — **реальність**, а не структура:
 *  - `habitId` мусить існувати в користувача;
 *  - дата мусить бути в ПОТОЧНОМУ Пн–Нд-тижні (фронт дозволяє редагувати лише його — `isCurrentWeek`);
 *  - майбутні дні заблоковані (як і в UI);
 *  - дубль (уже відмічено те саме) відкидаємо як no-op — **крім часових**, де повторна дія
 *    легальна: вона оновлює хвилини (тому ж і `prevMinutes` у пропозиції).
 * Відкинуте не зникає безслідно: повертаємо в `rejected`, щоб UI пояснив причину.
 */
function validateActions(
  actions: CheckinAction[],
  ctx: CheckinContext,
): { actions: ProposedAction[]; rejected: RejectedAction[] } {
  const habitById = new Map(ctx.habits.map((h) => [h.id, h]));
  const existingByDate = new Map(ctx.existing.map((e) => [e.date, e]));
  const ok: ProposedAction[] = [];
  const rejected: RejectedAction[] = [];

  for (const a of actions) {
    // Задача без дати — легальна («Загальна» картка); решта дат мусить бути валідною ISO.
    const { date } = a;
    if (date !== null) {
      if (!isISODate(date)) {
        rejected.push({ reason: "invalidShape", detail: `date="${date}"` });
        continue;
      }
      // Задачі можна ставити НА МАЙБУТНЄ (це план), а відмітки/настрій/щоденник — ні.
      if (a.type !== "task") {
        if (date < ctx.weekStart || date > ctx.weekEnd) {
          rejected.push({ reason: "outsideWeek", detail: date });
          continue;
        }
        if (date > ctx.today) {
          rejected.push({ reason: "futureDate", detail: date });
          continue;
        }
      }
    }

    if (a.type === "entry") {
      const habit = habitById.get(a.habitId);
      if (!habit) {
        rejected.push({ reason: "unknownHabit", detail: a.habitId });
        continue;
      }
      // Часова навичка без хвилин — беззмістовна відмітка; бінарна з хвилинами — шум.
      const isTimed = habit.kind === "timed";
      const minutes = isTimed ? (a.minutes ?? 0) : null;
      if (isTimed && a.done && minutes === 0) {
        rejected.push({ reason: "invalidShape", detail: `${habit.name}: timed without minutes` });
        continue;
      }
      const prev = existingByDate.get(a.date)?.done.find((d) => d.habitId === a.habitId);
      if (prev && a.done && !isTimed) {
        rejected.push({ reason: "duplicate", detail: habit.name });
        continue;
      }
      // Хвилини вже записані, а модель віддала стільке ж — нового змісту нема, це no-op.
      if (prev && isTimed && a.done && prev.minutes === minutes) {
        rejected.push({ reason: "duplicate", detail: habit.name });
        continue;
      }
      ok.push({ ...a, minutes, prevMinutes: isTimed ? (prev?.minutes ?? null) : undefined });
      continue;
    }

    if (a.type === "task") {
      const bad =
        (a.startTime !== null && !TIME_RE.test(a.startTime)) ||
        (a.endTime !== null && !TIME_RE.test(a.endTime)) ||
        (a.startTime !== null && a.endTime !== null && a.endTime < a.startTime);
      if (bad) {
        rejected.push({ reason: "invalidShape", detail: `${a.title}: time range` });
        continue;
      }
      if (a.habitId !== null && !habitById.has(a.habitId)) {
        // Мітка на навичку опційна — просто знімаємо її, задачу лишаємо.
        ok.push({ ...a, habitId: null });
        continue;
      }
    }

    ok.push(a);
  }

  return { actions: ok, rejected };
}

/**
 * Плоскі об'єкти від провайдера → форма, придатна для строгого union.
 * Провайдер часто просто **не віддає** поле замість явного `null`, тож добиваємо їх самі.
 */
function normalizeActions(raw: unknown, today: string): unknown[] {
  return (Array.isArray(raw) ? raw : []).map((a) => {
    const o = a as Record<string, unknown>;
    return {
      ...o,
      date: o.date ?? (o.type === "task" ? null : today),
      minutes: o.minutes ?? null,
      habitId: o.habitId ?? null,
      startTime: o.startTime ?? null,
      endTime: o.endTime ?? null,
    };
  });
}

/**
 * Перевірити ПРОПОЗИЦІЮ дій (з чек-іну або з чату — `propose_actions`) проти реальності.
 * Спільна точка навмисно: два шляхи до одних і тих самих записів мусять мати одну валідацію,
 * інакше вони розійдуться, і чат стане дірою в правилах, які чек-ін дотримує.
 */
export function validateProposal(
  rawActions: unknown,
  ctx: CheckinContext,
): { actions: ProposedAction[]; rejected: RejectedAction[] } {
  const normalized = normalizeActions(rawActions, ctx.today);
  const parsed: CheckinAction[] = [];
  const rejected: RejectedAction[] = [];
  for (const a of normalized) {
    const res = checkinResultSchema.shape.actions.element.safeParse(a);
    if (res.success) parsed.push(res.data);
    else rejected.push({ reason: "invalidShape", detail: describeAction(a) });
  }
  const checked = validateActions(parsed, ctx);
  return { actions: checked.actions, rejected: [...rejected, ...checked.rejected] };
}

/** Короткий людський опис дії, що не пройшла схему (для `rejected[].detail`). */
const describeAction = (a: unknown): string => {
  const o = (a ?? {}) as Record<string, unknown>;
  const label = o.title ?? o.text ?? o.habitId ?? o.type ?? "action";
  return String(label).slice(0, 80);
};

/** Зібрати контекст: навички + що вже відмічено за згадані дні (щоб не дублювати). */
export async function buildCheckinContext(userId: string, today: string): Promise<CheckinContext> {
  const weekStart = addDaysISO(today, -dowMon0(today));
  const weekEnd = addDaysISO(weekStart, 6);

  const [habits, entries, logs] = await Promise.all([
    prisma.habit.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, name: true, weeklyTarget: true, weeklyMinutesTarget: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.habitEntry.findMany({
      where: {
        habit: { userId, deletedAt: null },
        done: true,
        date: { gte: weekStart, lte: weekEnd },
      },
      select: { habitId: true, date: true, minutes: true },
    }),
    prisma.dailyLog.findMany({
      where: { userId, date: { gte: weekStart, lte: weekEnd } },
      select: { date: true, mood: true, notes: true },
    }),
  ]);

  type DayRow = {
    done: { habitId: string; minutes: number | null }[];
    mood: number | null;
    hasNotes: boolean;
  };
  const byDate = new Map<string, DayRow>();
  const ensure = (d: string) => {
    let row = byDate.get(d);
    if (!row) byDate.set(d, (row = { done: [], mood: null, hasNotes: false }));
    return row;
  };
  for (const e of entries) ensure(e.date).done.push({ habitId: e.habitId, minutes: e.minutes });
  for (const l of logs) {
    const row = ensure(l.date);
    row.mood = l.mood;
    row.hasNotes = Boolean(l.notes);
  }

  return {
    habits: habits.map((h) => ({
      id: h.id,
      name: h.name,
      kind: h.weeklyMinutesTarget != null ? "timed" : h.weeklyTarget != null ? "count" : "daily",
    })),
    existing: [...byDate.entries()].map(([date, v]) => ({ date, ...v })),
    today,
    weekStart,
    weekEnd,
  };
}

/**
 * Розібрати чек-ін. Нічого не пише — повертає пропозицію для картки підтвердження.
 * Квоту списуємо лише після успішного виклику провайдера (як у reflection).
 */
export async function parseCheckin(
  userId: string,
  text: string,
  today: string,
  locale: AiLocale,
  intent: "auto" | "log" | "plan",
): Promise<CheckinResponse> {
  const ctx = await buildCheckinContext(userId, today);
  if (ctx.habits.length === 0) throw Errors.aiNotEnoughData("No habits to check in against");

  const provider = getAiProvider();
  const result = await provider.generateJson({
    system: buildSystemPrompt(locale),
    // Контекст І текст людини — в одному блоці <user_data>, саме тому тегу, який system-промпт
    // називає «дані, а не інструкції». Якби текст лежав поза ним, анти-injection-правило
    // вказувало б не на нього — «ігноруй інструкції» всередині могло б стати командою.
    user: [
      buildCheckinInstruction(locale, intent),
      `<${USER_DATA_TAG}>`,
      `<context>\n${JSON.stringify(ctx)}\n</context>`,
      `<user_text>\n${text}\n</user_text>`,
      `</${USER_DATA_TAG}>`,
    ].join("\n\n"),
    schema: CHECKIN_JSON_SCHEMA,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    effort: "low",
  });

  let parsed: CheckinResult;
  try {
    const raw = JSON.parse(result.text) as { actions?: unknown[]; clarifications?: unknown[]; reply?: string };
    parsed = checkinResultSchema.parse({
      ...raw,
      actions: normalizeActions(raw.actions, ctx.today),
      clarifications: raw.clarifications ?? [],
    });
  } catch {
    throw Errors.aiUnavailable("AI returned malformed check-in");
  }

  const { actions, rejected } = validateActions(parsed.actions, ctx);

  await consumeQuota(userId, today, result.inputTokens, result.outputTokens);
  audit("ai.checkin", {
    userId,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });

  return {
    actions,
    clarifications: parsed.clarifications,
    reply: parsed.reply,
    rejected,
    context: { today: ctx.today, weekStart: ctx.weekStart, weekEnd: ctx.weekEnd },
  };
}
