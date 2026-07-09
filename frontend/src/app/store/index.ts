import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { baseApi } from "@/shared/api";
import { errorToastMiddleware } from "./errorToastMiddleware";
import { resetCacheMiddleware } from "./resetCacheMiddleware";
import { themeReducer, getSystemTheme, type Theme } from "@/features/theme";
import {
  accentReducer,
  DEFAULT_ACCENT,
  type AccentKey,
} from "@/features/accent";
import { localeReducer } from "@/features/locale";
import {
  uiPrefsReducer,
  type TableLayout,
  type TaskListStyle,
} from "@/features/ui-prefs";
import { periodReducer, type Scale } from "@/features/period-navigation";
import { statsPeriodReducer } from "@/features/stats-period";
import { authReducer, initialAuthState, type AuthState } from "@/features/auth";
import { todayISODate } from "@/shared/lib";
import {
  getStoredLocale,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "@/shared/config/i18n";

const THEME_KEY = "tracker-theme";
const ACCENT_KEY = "tracker-accent";
const HABIT_COL_WIDTH_KEY = "tracker-habit-col-width";
const TABLE_LAYOUT_KEY = "tracker-table-layout";
const STATS_GOAL_KEY = "tracker-stats-goal";
const HIDDEN_STAT_WIDGETS_KEY = "tracker-hidden-stat-widgets";
const PERIOD_SCALE_KEY = "tracker-period-scale";
const ALLOW_EDIT_PAST_KEY = "tracker-allow-edit-past";
const TASK_LIST_STYLE_KEY = "tracker-task-list-style";
const EDITOR_SCALE_KEY = "tracker-editor-scale";
const AUTH_KEY = "tracker-auth";

type PersistedState = {
  theme: { value: Theme };
  accent: { value: AccentKey };
  locale: { value: Locale };
  uiPrefs: {
    habitColWidth: number | null;
    tableLayout: TableLayout;
    statsGoalPct: number | null;
    hiddenStatWidgets: string[];
    allowEditingPastDays: boolean;
    taskListStyle: TaskListStyle;
    editorScale: number;
  };
  // anchor — session-only (завжди стартує з «сьогодні»); персиститься лише scale.
  period: { anchor: string; scale: Scale };
  // Сесія: рефреш не розлогінює. Нема збереженого → anonymous.
  auth: AuthState;
};

// Персистимо лише {status, user} (для миттєвого UI без флешу при рехідрації). Жодного токена
// в localStorage немає: access/refresh/csrf живуть у cookie (Security-фаза, варіант B). На буті
// SessionProvider валідує сесію (`GET /auth/me`, тихий refresh на 401). Явно реконструюємо
// об'єкт (відкидаємо можливий застарілий `token` зі старого формату → без зайвих ключів у стані).
type PersistedAuth = Pick<AuthState, "status" | "user">;

function readPersistedAuth(): AuthState {
  const stored = read<PersistedAuth | null>(AUTH_KEY, null);
  if (!stored) return initialAuthState;
  return { status: stored.status, user: stored.user };
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    // private mode / quota / corrupt value
    return fallback;
  }
}

function loadPersistedState(): PersistedState | undefined {
  if (typeof window === "undefined") return undefined;
  return {
    theme: { value: read<Theme>(THEME_KEY, getSystemTheme()) },
    accent: { value: read<AccentKey>(ACCENT_KEY, DEFAULT_ACCENT) },
    locale: { value: getStoredLocale() },
    uiPrefs: {
      habitColWidth: read<number | null>(HABIT_COL_WIDTH_KEY, null),
      tableLayout: read<TableLayout>(TABLE_LAYOUT_KEY, "columns"),
      statsGoalPct: read<number | null>(STATS_GOAL_KEY, null),
      hiddenStatWidgets: read<string[]>(HIDDEN_STAT_WIDGETS_KEY, []),
      allowEditingPastDays: read<boolean>(ALLOW_EDIT_PAST_KEY, false),
      taskListStyle: read<TaskListStyle>(TASK_LIST_STYLE_KEY, "checkbox"),
      editorScale: read<number>(EDITOR_SCALE_KEY, 1),
    },
    period: {
      anchor: todayISODate(),
      scale: read<Scale>(PERIOD_SCALE_KEY, "week"),
    },
    auth: readPersistedAuth(),
  };
}

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    accent: accentReducer,
    locale: localeReducer,
    uiPrefs: uiPrefsReducer,
    // Перегляд періоду (anchor + scale). Session-only: НЕ у persist-підписці нижче.
    // anchor — session-only; персиститься лише scale (нижче в підписці).
    period: periodReducer,
    // Перегляд статистики (масштаб + фільтр звички). Session-only.
    statsPeriod: statsPeriodReducer,
    // Сесія користувача (персист у tracker-auth нижче).
    auth: authReducer,
    // Серверний стан (навички/відмітки/auth) — RTK Query. Кеш session-only (без persist).
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      baseApi.middleware,
      errorToastMiddleware,
      resetCacheMiddleware,
    ),
  preloadedState: loadPersistedState(),
});

// refetchOnFocus / refetchOnReconnect для RTK Query.
setupListeners(store.dispatch);

store.subscribe(() => {
  try {
    const state = store.getState();
    localStorage.setItem(THEME_KEY, JSON.stringify(state.theme.value));
    localStorage.setItem(ACCENT_KEY, JSON.stringify(state.accent.value));
    localStorage.setItem(
      LOCALE_STORAGE_KEY,
      JSON.stringify(state.locale.value),
    );
    localStorage.setItem(
      HABIT_COL_WIDTH_KEY,
      JSON.stringify(state.uiPrefs.habitColWidth),
    );
    localStorage.setItem(
      TABLE_LAYOUT_KEY,
      JSON.stringify(state.uiPrefs.tableLayout),
    );
    localStorage.setItem(
      STATS_GOAL_KEY,
      JSON.stringify(state.uiPrefs.statsGoalPct),
    );
    localStorage.setItem(
      HIDDEN_STAT_WIDGETS_KEY,
      JSON.stringify(state.uiPrefs.hiddenStatWidgets),
    );
    localStorage.setItem(
      ALLOW_EDIT_PAST_KEY,
      JSON.stringify(state.uiPrefs.allowEditingPastDays),
    );
    localStorage.setItem(
      TASK_LIST_STYLE_KEY,
      JSON.stringify(state.uiPrefs.taskListStyle),
    );
    localStorage.setItem(
      EDITOR_SCALE_KEY,
      JSON.stringify(state.uiPrefs.editorScale),
    );
    localStorage.setItem(
      PERIOD_SCALE_KEY,
      JSON.stringify(state.period.scale),
    );
    // Лише {status, user}; `token` — поза localStorage (тримається в пам'яті).
    localStorage.setItem(
      AUTH_KEY,
      JSON.stringify({
        status: state.auth.status,
        user: state.auth.user,
      } satisfies PersistedAuth),
    );
  } catch {
    // ignore (private mode / quota)
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
