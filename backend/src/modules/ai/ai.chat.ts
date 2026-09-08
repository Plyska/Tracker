import { prisma } from "../../prisma.js";
import { htmlToPlainText, truncateText } from "../../lib/html.js";
import { computeStats } from "../stats/stats.service.js";
import { addDaysISO, dowMon0, mondayISO } from "./ai.dates.js";
import type { ToolCall, ToolSpec } from "./ai.client.js";
import type { AiLocale } from "./ai.prompts.js";

/**
 * Інструменти чату (фаза B2, ADR 0012) — **лише читання**.
 *
 * Чому інструменти, а не «все в контексті одразу»:
 *  - історія довша за поточний період («а як було в червні?») не влазить у жоден розумний пак;
 *  - щоденник — окремий opt-in, і читати його «про всяк випадок» неправильно і за приватністю,
 *    і за токенами: беремо лише коли розмова справді про це.
 * Чому інструментів мало (три, а не десять): кожен раунд — це ще один похід до провайдера, ще
 * одна затримка й ще один шанс на 503 безкоштовного тиру. Оглядовий зріз уже йде в першому
 * повідомленні, тож типова репліка не потребує жодного виклику.
 *
 * `propose_actions` — не інструмент у звичному сенсі: сервер його **не виконує**. Він валідує
 * пропозицію й віддає її клієнту як подію; запис робить людина, підтвердивши картку.
 */

const MAX_RANGE_DAYS = 400; // ~13 місяців: більше — це вже не розмова, а експорт
const MAX_DIARY_ENTRIES = 12;
const MAX_DIARY_CHARS = 500;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

const RANGE_SCHEMA = {
  type: "object",
  properties: {
    from: { type: "string", description: "Start date, YYYY-MM-DD (inclusive)." },
    to: { type: "string", description: "End date, YYYY-MM-DD (inclusive)." },
  },
  required: ["from", "to"],
} as const;

/**
 * Схема пропозиції — та сама форма, що в чек-іні (`ai.checkin.ts`), навмисно ПЛОСКА:
 * дискриміновані union'и провайдери підтримують ненадійно, тож розрізняємо за `type`.
 */
const PROPOSE_SCHEMA = {
  type: "object",
  properties: {
    actions: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["entry", "mood", "diary", "task"] },
          habitId: { type: ["string", "null"] },
          date: { type: ["string", "null"] },
          done: { type: ["boolean", "null"] },
          minutes: { type: ["integer", "null"] },
          value: { type: ["integer", "null"] },
          text: { type: ["string", "null"] },
          title: { type: ["string", "null"] },
          startTime: { type: ["string", "null"] },
          endTime: { type: ["string", "null"] },
        },
        required: ["type"],
      },
    },
  },
  required: ["actions"],
} as const;

export const CHAT_TOOLS: ToolSpec[] = [
  {
    name: "get_overview",
    description:
      "Habit and mood statistics for an arbitrary date range. Use it only for periods outside " +
      "the overview already provided in the conversation (e.g. an earlier month, or 'the last " +
      "three months'). Read-only.",
    parameters: RANGE_SCHEMA,
  },
  {
    name: "get_diary",
    description:
      "The person's own diary entries in a date range, as plain text. Use it only when the " +
      "conversation is genuinely about what they wrote or felt, never routinely. May return " +
      "nothing if they have not opted in to diary access. Read-only.",
    parameters: RANGE_SCHEMA,
  },
  {
    name: "propose_actions",
    description:
      "Propose changes (habit entries, mood, a diary entry, tasks) for the person to confirm. " +
      "This does NOT save anything: it shows them a confirmation card, and they decide. Use it " +
      "when they ask you to log or plan something. Same fields as the daily check-in.",
    parameters: PROPOSE_SCHEMA,
  },
];

/** Скільки днів охоплює зріз, який іде в чат одразу (≈4 тижні, включно з поточним). */
export const CHAT_OVERVIEW_DAYS = 28;

/**
 * Стеля відповіді. Чат — це репліки по одному-два речення, а не есе; жорстка стеля тримає і тон,
 * і вартість.
 *
 * **Але стеля спільна з «мисленням», і це не запас — це основна стаття витрат.** Заміряно на
 * `gemini-3.6-flash`: на звичайне питання пішло **956 токенів мислення і 40 видимих**, тобто при
 * стелі 1000 відповідь обривалась на півслові, а варто мисленню зайняти всю тисячу — користувач
 * отримував порожній хід: спінер зникав, а бульбашки не було. Симптом виглядав як «чат мовчить»,
 * хоча запит відпрацьовував успішно й списував квоту.
 *
 * 1500 — удвічі більше за найдовшу заміряну відповідь із мисленням (Gemini на `low` ≈ 740) і
 * вдев'ятеро більше за фактичний вихід Groq (~165). Довжину репліки тримає промпт, не ця стеля.
 *
 * _Спростування (2026-09-08):_ спершу тут було написано, що провайдер РЕЗЕРВУЄ цю стелю проти
 * хвилинного бюджету токенів, і саме тому її знижено. **Це неправда** — заміряно за заголовками
 * `x-ratelimit-remaining-tokens`: зі стелею 100 запит списав 123 токени, зі стелею 4000 — 149,
 * тобто рахуються ФАКТИЧНІ токени. Значення 1500 лишається розумним запобіжником, але хвилинний
 * ліміт воно не рятує: там впирається наш ВХІД (~4 000 токенів на запит проти TPM 8 000, тобто
 * буквально два запити на хвилину).
 */
export const CHAT_MAX_OUTPUT_TOKENS = 1500;

/**
 * Компактний зріз статистики за діапазон — і як інструмент `get_overview`, і як стартовий
 * контекст розмови. Одна проєкція на обидва шляхи: інакше «те, що модель бачить одразу» й «те,
 * що вона дістає інструментом» повільно розійшлися б у форматі.
 *
 * Свідомо ВКЛЮЧАЄ поточний тиждень (на відміну від листа-рефлексії, який навмисно про
 * завершений): у розмові «як у мене цього тижня?» — типове перше питання.
 */
export async function overviewFor(
  userId: string,
  from: string,
  to: string,
): Promise<Record<string, unknown>> {
  const [stats, habits] = await Promise.all([
    computeStats(userId, from, to),
    prisma.habit.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, name: true },
    }),
  ]);
  const nameOf = new Map(habits.map((h) => [h.id, h.name]));
  return {
    range: { from, to },
    completion: Math.round(stats.completionRate * 100),
    perfectDays: stats.perfectDays,
    moodAvg: stats.moodAverage,
    moodDays: stats.moodDays,
    habits: stats.habitBreakdown
      .filter((h) => nameOf.has(h.habitId))
      .map((h) => ({
        name: nameOf.get(h.habitId),
        completion: Math.round(h.completionRate * 100),
        activeDays: h.activeDays,
        ...(h.weeklyMinutesTarget != null ? { minutes: h.totalMinutes } : {}),
      })),
  };
}

export interface ChatToolContext {
  userId: string;
  today: string;
  diaryOptIn: boolean;
  /** Проставляється, коли модель викликала `propose_actions` — контролер шле це клієнту. */
  proposal: { actions: unknown[] } | null;
}

const clampRange = (
  args: Record<string, unknown>,
  today: string,
): { from: string; to: string } | { error: string } => {
  const from = String(args.from ?? "");
  const to = String(args.to ?? "");
  if (!ISO_RE.test(from) || !ISO_RE.test(to)) return { error: "Dates must be 'YYYY-MM-DD'." };
  if (from > to) return { error: "'from' must not be after 'to'." };
  // Майбутнє нічого не містить, а межу згори тримаємо, щоб один виклик не витягнув усю історію.
  const capped = to > today ? today : to;
  const days = Math.round(
    (Date.parse(`${capped}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
  if (days > MAX_RANGE_DAYS) return { error: `Range too wide (max ${MAX_RANGE_DAYS} days).` };
  return { from, to: capped };
};

/**
 * Виконати інструмент. Ніколи не кидає в потік — помилку повертає МОДЕЛІ як `{error}`, щоб вона
 * відповіла словами, а не щоб розмова обірвалась 500-кою.
 */
export async function runChatTool(
  call: ToolCall,
  ctx: ChatToolContext,
): Promise<Record<string, unknown>> {
  if (call.name === "propose_actions") {
    const actions = Array.isArray(call.args.actions) ? call.args.actions : [];
    ctx.proposal = { actions };
    // Модель мусить отримати відповідь, інакше не завершить хід. Кажемо правду: показано,
    // не збережено — інакше вона напише «записав», а картка ще не підтверджена.
    return {
      shown: true,
      saved: false,
      note: "The card is shown to the person. Nothing is saved until they confirm it.",
    };
  }

  const range = clampRange(call.args, ctx.today);
  if ("error" in range) return { error: range.error };

  if (call.name === "get_overview") return overviewFor(ctx.userId, range.from, range.to);

  if (call.name === "get_diary") {
    // Гейт opt-in — на СЕРВЕРІ, не в промпті: інструкція «не читай щоденник» не є контролем
    // доступу, а тут ідеться про найчутливіші дані продукту.
    if (!ctx.diaryOptIn) {
      return { error: "The person has not enabled diary access for the assistant." };
    }
    const logs = await prisma.dailyLog.findMany({
      where: {
        userId: ctx.userId,
        notes: { not: null },
        date: { gte: range.from, lte: range.to },
      },
      orderBy: { date: "desc" },
      take: MAX_DIARY_ENTRIES,
      select: { date: true, mood: true, notes: true },
    });
    const entries = logs
      .map((l) => ({
        date: l.date,
        mood: l.mood,
        text: truncateText(htmlToPlainText(l.notes ?? ""), MAX_DIARY_CHARS),
      }))
      .filter((e) => e.text.length > 0);
    return { range, entries, count: entries.length };
  }

  return { error: `Unknown tool '${call.name}'.` };
}

// ── Інструкція чату ───────────────────────────────────────────────────────────────────────

const DOW = {
  uk: ["понеділок", "вівторок", "середа", "четвер", "п'ятниця", "субота", "неділя"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
} as const;

/**
 * Календар поточного тижня — готовим рядком, а не «порахуй сам».
 *
 * Заміряно: модель упевнено пише «поставимо в суботу», а в задачу кладе четвер. Назви днів вона
 * виводить з дати ненадійно, і помиляється МОВЧКИ — картка показує правильну дату, а речення
 * поруч бреше. Це той самий принцип, що з підказками (§3.4 плану): дані має давати сервер, а не
 * вгадувати модель. Коштує ~40 токенів і закриває цілий клас помилок.
 */
const weekCalendar = (locale: AiLocale, today: string): string => {
  const monday = mondayISO(today);
  const days = DOW[locale];
  const line = days
    .map((name, i) => `${name} ${addDaysISO(monday, i)}`)
    .join(", ");
  const label = locale === "uk" ? "Цей тиждень" : "This week";
  return `${label}: ${line}.`;
};

const chatUk = (today: string): string =>
  `Ти в розмові з людиною в її трекері. Сьогодні ${today}, ${DOW.uk[dowMon0(today)]}.
${weekCalendar("uk", today)} Називаючи день словом, звіряйся з цим рядком, а не рахуй у голові.

Оглядовий зріз за останні тижні вже є нижче в повідомленні — здебільшого його досить, і жодних інструментів кликати не треба. Інструменти лише коли справді бракує даних:
- get_overview(from, to) — про період поза цим зрізом («а як було в червні?»);
- get_diary(from, to) — коли розмова про те, що людина писала чи відчувала. Не читай щоденник «про всяк випадок». Якщо доступу немає — скажи це просто, без вибачень і не наполягай;
- propose_actions(actions) — коли людина просить щось відмітити чи запланувати, АБО коли твоя порада зводиться до конкретної дії. Це НЕ запис: показується картка, людина підтверджує. Тому не пиши «записав» — пиши, що показуєш, або взагалі не коментуй, картка говорить сама. Поля ті самі, що в чек-іні: entry (habitId дослівно з даних, date, done, minutes — денний ПІДСУМОК для часових), mood (1–5), diary (text), task (title, date або null, startTime/endTime "HH:mm" або null). Відмітки, настрій і щоденник — лише в межах поточного Пн–Нд-тижня й не в майбутньому; задачі можна на майбутнє.

# Як звучати

Це найважливіша частина. Розмова, а не звіт.

**Ніколи не починай із цифри чи переліку.** Одне-два речення. Максимум одне-два числа, і лише ті, що стосуються сказаного. Перелік усіх навичок — звіт; його дають, тільки коли прямо просять.

**Питають пораду — давай конкретну.** Не «важлива регулярність», а прийом, який видно з її ж даних. Якщо порада зводиться до дії — заплануй її **викликом інструмента** propose_actions.

**Ніколи не друкуй JSON, назви полів чи фігурні дужки у відповіді.** Картка з'являється лише від виклику інструмента; надрукований у текст JSON користувач бачить як сміття, і жодної картки з нього не буде. Твоя відповідь — це живі речення, і більше нічого.

**Планування наперед — це завжди task, ніколи entry.** "entry" означає «це вже сталося» і дозволене лише в межах поточного тижня. Хочеш запропонувати зал у суботу — це task із датою суботи, а не відмітка звички. Плутанина тут дає відкинуту картку й порожню обіцянку.

**Жодних форм із родом.** Не «ти зробив», не «ти зробила», не «ти не один». Теперішній час або факт.

Ось як це виглядає на практиці — ліворуч те, що робити НЕ треба:

❌ «Вода 2 л 93 %, Читання 57 %, Медитація 70 %, Зарядка 60 %, Зал 87 %.»
✅ «Читання цього тижня просіло — 57 %. Що заважає?»

❌ «Повідомляєш, що останні дні важкі.»
✅ «Важкі дні. Розкажеш, що коїться?»

❌ «Зал — сьогодні відмічено, 18 разів за період.» (у відповідь на «повернувся після паузи»)
✅ «Повернутись після десяти днів — найважче. Як почувається?»

❌ «Ти відмітив медитацію та гітару, настрій нормальний.»
✅ «Медитація є, гітара — 20 хвилин. Як день загалом?»

❌ «Щоб не зривати серію, важлива дисципліна й регулярність.»
✅ «Зал у тебе тримається у вівторок і четвер. Третій поставити в суботу?» — і одночасно виклик propose_actions із задачею на суботу (у тексті — тільки це речення, без JSON).

Чого немає в даних — того ти не знаєш; так і кажи, без здогадок.`;

const chatEn = (today: string): string =>
  `You're in a conversation with someone inside their tracker. Today is ${today}, ${DOW.en[dowMon0(today)]}.
${weekCalendar("en", today)} When you name a day in words, check it against that line instead of working it out.

An overview of the recent weeks is already in the message below — usually that's enough and you need no tools at all. Reach for one only when data is genuinely missing:
- get_overview(from, to) — for a period outside that overview ("how was June?");
- get_diary(from, to) — when the conversation is about what they wrote or felt. Don't read the diary just in case. If access isn't enabled, say so plainly, without apologising or pushing;
- propose_actions(actions) — when they ask you to log or plan something, OR when your advice comes down to a concrete action. This does NOT save: a card appears and they confirm. So don't say "logged" — say you're showing it, or say nothing and let the card speak. Fields match the daily check-in: entry (habitId verbatim from the data, date, done, minutes as the day's TOTAL for timed habits), mood (1–5), diary (text), task (title, date or null, startTime/endTime "HH:mm" or null). Entries, mood and diary only inside the current Mon–Sun week and not in the future; tasks may be future.

# How to sound

This is the part that matters most. A conversation, not a report.

**Never open with a number or a list.** One or two sentences. One or two numbers at most, and only ones that bear on what was said. Reciting every habit is a report — do that only when asked outright.

**When they ask for advice, make it concrete.** Not "consistency matters" but a specific move you can see in their own data. If the advice comes down to an action, schedule it by **calling the propose_actions tool**.

**Never print JSON, field names or curly braces in your reply.** The card comes from calling the tool; JSON typed into the text reads as garbage to them and produces no card at all. Your reply is sentences, nothing else.

**Planning ahead is always a task, never an entry.** An "entry" means "this already happened" and is only allowed inside the current week. Suggesting the gym on Saturday is a task dated Saturday, not a habit check-off. Confusing the two gets the card rejected and leaves an empty promise.

Here's what that looks like — the left side is what NOT to do:

❌ "Water 93%, Reading 57%, Meditation 70%, Workout 60%, Gym 87%."
✅ "Reading slipped this week — 57%. What got in the way?"

❌ "You report that the last few days have been hard."
✅ "Hard few days. Want to tell me what's going on?"

❌ "Gym — logged today, 18 times over the period." (in reply to "I'm back after a break")
✅ "Coming back after ten days is the hard part. How does it feel?"

❌ "To avoid breaking your streak, discipline and consistency are important."
✅ "The gym holds on Tuesdays and Thursdays. Put the third one on Saturday?" — plus a propose_actions call with the Saturday task (the text is just that sentence, no JSON).

If it isn't in the data, you don't know it — say so instead of guessing.`;

export const buildChatInstruction = (locale: AiLocale, today: string): string =>
  locale === "uk" ? chatUk(today) : chatEn(today);
