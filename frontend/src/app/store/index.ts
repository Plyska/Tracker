import { configureStore } from "@reduxjs/toolkit";
import { themeReducer, getSystemTheme, type Theme } from "@/features/theme";
import {
  accentReducer,
  DEFAULT_ACCENT,
  type AccentKey,
} from "@/features/accent";
import { localeReducer } from "@/features/locale";
import { uiPrefsReducer } from "@/features/ui-prefs";
import { habitsReducer } from "@/entities/habit";
import { entriesReducer } from "@/entities/habit-entry";
import {
  getStoredLocale,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "@/shared/config/i18n";

const THEME_KEY = "tracker-theme";
const ACCENT_KEY = "tracker-accent";
const HABIT_COL_WIDTH_KEY = "tracker-habit-col-width";

type PersistedState = {
  theme: { value: Theme };
  accent: { value: AccentKey };
  locale: { value: Locale };
  uiPrefs: { habitColWidth: number | null };
};

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
    uiPrefs: { habitColWidth: read<number | null>(HABIT_COL_WIDTH_KEY, null) },
  };
}

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    accent: accentReducer,
    locale: localeReducer,
    uiPrefs: uiPrefsReducer,
    // Мок серверного стану (session-only). На Фазі 9 переїде в RTK Query.
    habits: habitsReducer,
    entries: entriesReducer,
  },
  preloadedState: loadPersistedState(),
});

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
  } catch {
    // ignore (private mode / quota)
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
