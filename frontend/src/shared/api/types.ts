/**
 * Wire-типи API (DTO) — рівно за [api-contract.md](../../../../docs/api-contract.md).
 * Це контракт між frontend і backend, тому живуть у `shared` (нижній шар): не залежать
 * від доменних типів entities. Опційні поля — явні `null` (а не `undefined`).
 * entities маплять DTO → domain через `transformResponse`.
 */

export type Plan = "free" | "pro";

export interface HabitDto {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  weeklyTarget: number | null; // null = щоденна; 1..6 = «N разів на тиждень» (ADR 0010)
  weeklyMinutesTarget: number | null; // null = не часова; >0 = ціль хвилин/тиждень (ADR 0011)
  createdAt: string; // ISO 'YYYY-MM-DD'
}

/** Навичка в кошику (`GET /habits/trash`): базовий DTO + коли видалено / коли буде остаточно прибрано. */
export interface TrashedHabitDto extends HabitDto {
  deletedAt: string; // ISO datetime
  purgeAt: string; // ISO datetime — момент остаточного видалення
}

export interface HabitEntryDto {
  habitId: string;
  date: string; // 'YYYY-MM-DD'
  done: boolean;
  minutes: number | null; // null для бінарних; хвилини за день для часових (ADR 0011)
}

export interface UserDto {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: Plan;
  role: "user" | "admin";
}

export interface DailyLogDto {
  date: string; // 'YYYY-MM-DD'
  mood: number; // 1–5
  notes: string | null;
}

export interface StatsDto {
  completionRate: number; // 0..1
  currentStreak: number;
  longestStreak: number;
  perfectDays: number;
  bestHabit: { habitId: string; completionRate: number } | null;
  // Частка виконання по кожній звичці за період (активні ≥1 день) — для «movers».
  habitBreakdown: {
    habitId: string;
    completionRate: number;
    activeDays: number;
    weeklyTarget: number | null;
    weeklyMinutesTarget: number | null; // null = не часова; >0 = ціль хвилин/тиждень (ADR 0011)
    totalMinutes: number; // сумарно хвилин за період (0 для бінарних)
  }[];
  moodAverage: number | null;
  moodDays: number;
  daily: {
    date: string;
    completed: number;
    total: number;
    mood: number | null;
    minutes: number; // сума хвилин часових навичок за день (ADR 0011)
  }[];
  moodCorrelations: {
    habitId: string;
    moodWith: number;
    moodWithout: number;
    delta: number;
    sampleWith: number;
    sampleWithout: number;
  }[];
  moodVsCompletion: {
    delta: number;
    lowAvg: number;
    highAvg: number;
    sampleDays: number;
  } | null;
  habitSynergies: {
    habitA: string;
    habitB: string;
    rate: number; // P(B | A виконано), 0..1
    baseline: number; // базова частка B, 0..1
    delta: number; // rate − baseline
    sampleDays: number;
  }[];
  habitStreaks: { habitId: string; current: number; longest: number }[];
}

/**
 * Задача розпорядку дня / списку справ. `startTime`/`endTime` ('HH:mm', локальний час без TZ —
 * ADR 0009): задані ⇒ елемент розпорядку, обидва `null` ⇒ елемент списку справ. `habitId` —
 * опційна мітка на навичку.
 */
export interface TaskDto {
  id: string;
  date: string | null; // 'YYYY-MM-DD'; null = без дати («Загальна» картка)
  title: string;
  startTime: string | null; // 'HH:mm'
  endTime: string | null; // 'HH:mm'
  habitId: string | null;
  done: boolean;
  createdAt: string; // ISO 'YYYY-MM-DD'
}

/** Тіло будь-якої помилки API. */
export interface ApiError {
  message: string; // людиночитабельне
  code: string; // машинне, напр. 'HABIT_NOT_FOUND'
}

// --- Request bodies ---

export interface CreateHabitRequest {
  name: string;
  color: string;
  icon?: string | null;
  weeklyTarget?: number | null; // null / відсутнє = щоденна; 1..6 = тижнева ціль
  weeklyMinutesTarget?: number | null; // >0 = часова навичка (ціль хвилин/тиждень); ADR 0011
}

export type UpdateHabitRequest = Partial<{
  name: string;
  color: string;
  icon: string | null;
  weeklyTarget: number | null;
  weeklyMinutesTarget: number | null;
}>;

export interface ToggleEntryRequest {
  habitId: string;
  date: string;
  done: boolean;
  minutes?: number | null; // часова навичка: хвилини за день (сервер виводить done); ADR 0011
}

export interface UpsertDailyLogRequest {
  date: string;
  mood: number; // 1–5
  notes?: string;
}

export interface CreateTaskRequest {
  date?: string | null; // null/відсутня → «Загальна» картка
  title: string;
  startTime?: string | null;
  endTime?: string | null;
  habitId?: string | null;
}

export type UpdateTaskRequest = Partial<{
  date: string | null;
  title: string;
  startTime: string | null;
  endTime: string | null;
  habitId: string | null;
  done: boolean;
}>;

export interface StatsQuery {
  from: string; // 'YYYY-MM-DD'
  to: string; // 'YYYY-MM-DD'
  habitId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

/**
 * Оновлення профілю (`PATCH /auth/me`): ім'я + (опц.) аватар. Email/пароль — окремі флоу.
 * `avatarUrl`: `undefined` — не чіпати; `null` — прибрати; data-URL (base64) — встановити.
 */
export interface UpdateProfileRequest {
  name: string;
  avatarUrl?: string | null;
}

/**
 * Cookie-флоу (Security-фаза, варіант B): токени не в тілі. login/register повертають лише
 * `{ user }`; access/refresh/csrf виставляє бекенд у cookie. refresh → 204 (теж лише cookie).
 */
export interface AuthResponse {
  user: UserDto;
}

export type OAuthProvider = "google";

/**
 * Клієнтські налаштування, збережені в БД (`/me/preferences`). Усі поля nullable:
 * `null` = не задано → клієнт застосовує дефолт. Значення — рядки/числа (набори валідує фронт).
 */
export interface PreferencesDto {
  theme: string | null;
  accent: string | null;
  locale: string | null;
  tableLayout: string | null;
  statsGoalPct: number | null;
  hiddenStatWidgets: string[] | null; // null = ще не зберігалось (для seed-логіки)
  editorScale: number | null;
  // AI-помічник (ADR 0012). null = не задано → трактуємо як false.
  aiEnabled: boolean | null;
  aiDiaryOptIn: boolean | null;
  aiConsentAt: string | null; // ISO datetime; ставить СЕРВЕР при першому вмиканні (read-only)
  /**
   * Граматичний рід звертання: 'masculine' | 'feminine'; null = ще не питали.
   * Це форма слів, а не стать: українською «ти зробив» і «ти зробила» — різні речення.
   */
  aiAddressForm: string | null;
}

/** PATCH /me/preferences — часткове оновлення (передаємо лише те, що змінилось). */
export type UpdatePreferencesRequest = Partial<{
  theme: string;
  accent: string;
  locale: string;
  tableLayout: string;
  statsGoalPct: number | null;
  hiddenStatWidgets: string[];
  editorScale: number;
  // AI: пишуться ЯВНО (екран згоди / тумблери в Settings), а не через debounce-синк префів —
  // інакше локальний `false` до гідрації міг би вимкнути помічника, увімкненого на іншому
  // пристрої. `aiConsentAt` клієнт не надсилає — це серверне поле.
  aiEnabled: boolean;
  aiDiaryOptIn: boolean;
  aiAddressForm: "masculine" | "feminine";
}>;

// --- AI-помічник (ADR 0012) ---

/**
 * Підказка-патерн. Генерується БЕЗ LLM: сервер віддає ключ+параметри, текст рендерить клієнт
 * з i18n-шаблону `ai.insights.<key>.v<variant>` — тож підказка не може «вигадати» число.
 */
export interface InsightDto {
  key: string;
  variant: number; // індекс формулювання (ротація за днем — проти відчуття шаблонності)
  severity: "care" | "notice" | "info";
  params: Record<string, string | number>;
  seed: string; // машинна зачіпка для засівання чату (фаза B2)
}

export interface ReflectionItemDto {
  habitId: string | null; // звірено з контекстом на сервері — id завжди існує або null
  text: string;
}

export interface ReflectionContentDto {
  headline: string;
  highlights: ReflectionItemDto[];
  slips: ReflectionItemDto[];
  pattern: { kind: string; text: string } | null;
  question: string;
  /** Тепла нотатка про підтримку при стійко низькому настрої; null — сигналів немає. */
  care: string | null;
}

export interface ReflectionDto {
  period: "week" | "month";
  periodKey: string; // '2026-W36' | '2026-09'
  // Межі періоду (ISO). Рахує СЕРВЕР — клієнт не відтворює правил ISO-тижня.
  periodStart: string;
  periodEnd: string;
  locale: string;
  /** `null` рівно тоді, коли `crisis` не null: у кризі листа немає — є відповідь. */
  content: ReflectionContentDto | null;
  /** Кризова відповідь текстом сервера. Клієнт показує її ЗАМІСТЬ листа. */
  crisis: string | null;
  createdAt: string;
  cached: boolean; // true → віддано з кешу (нуль токенів)
}

/** Елемент історії листів (кеш = архів): без повного вмісту, лише заголовок. */
export interface ReflectionSummaryDto {
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  locale: string;
  headline: string;
  createdAt: string;
}

export interface AiQuotaDto {
  used: number;
  limit: number;
  remaining: number;
  configured: boolean; // false → провайдер не налаштований (ключа немає)
}

export interface ReflectionRequest {
  period: "week" | "month";
  today: string; // локальна дата клієнта — без TZ-дрейфу
  locale: "en" | "uk";
}

/**
 * Чек-ін (фаза B1): текст → дії. Сервер лише **пропонує** — записує клієнт після підтвердження,
 * через ті самі мутації, що й ручні дії (ADR 0012: модель не пише в БД).
 */
export interface CheckinRequest {
  text: string;
  today: string;
  locale: "en" | "uk";
  intent: "auto" | "log" | "plan"; // підказка за часом доби; розпізнає все одно модель
}

export type CheckinActionDto =
  | {
      type: "entry";
      habitId: string;
      date: string;
      done: boolean;
      minutes: number | null;
      /** Скільки хвилин уже записано за цей день (часові звички) — щоб показати «30 → 70». */
      prevMinutes?: number | null;
    }
  | { type: "mood"; date: string; value: number }
  | { type: "diary"; date: string; text: string }
  | {
      type: "task";
      date: string | null;
      title: string;
      startTime: string | null;
      endTime: string | null;
      habitId: string | null;
    };

export interface CheckinClarificationDto {
  field: string;
  question: string;
  options: string[];
}

/** Відкинуте сервером — показуємо з поясненням, а не ковтаємо мовчки. */
export interface CheckinRejectedDto {
  reason: "outsideWeek" | "unknownHabit" | "futureDate" | "invalidShape" | "duplicate";
  detail: string;
}

export interface CheckinResponseDto {
  actions: CheckinActionDto[];
  clarifications: CheckinClarificationDto[];
  /** Порожній рівно тоді, коли `crisis` не `null`: у кризі картки немає, є відповідь. */
  reply: string;
  rejected: CheckinRejectedDto[];
  /**
   * Кризова відповідь готовим текстом від сервера — показується ЗАМІСТЬ картки підтвердження.
   * Текст серверний, бо контакти мають бути дослівні, а формулювання — без роду.
   */
  crisis: string | null;
  context: { today: string; weekStart: string; weekEnd: string };
}
