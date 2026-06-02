/**
 * Підтримувані мови інтерфейсу. `label` — рідна назва мови (не перекладається).
 * Ключ синхронізується з ресурсами i18next та значенням `localeSlice`.
 */
export type Locale = "en" | "uk";

export interface LocaleOption {
  value: Locale;
  label: string;
}

export const LOCALES: LocaleOption[] = [
  { value: "en", label: "English" },
  { value: "uk", label: "Українська" },
];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_STORAGE_KEY = "tracker-locale";

const SUPPORTED = LOCALES.map((l) => l.value) as string[];

function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED.includes(value);
}

/**
 * Мова браузера: перша з упорядкованого списку переваг (`navigator.languages`),
 * що є серед підтримуваних, інакше дефолт. Адаптивно — детекція керується `LOCALES`,
 * тож додавання нової мови туди (+ JSON + ресурси i18n) одразу вмикає автоперемикання.
 * Регіональні теги ("uk-UA", "en-US") звужуються до основного субтегу.
 */
export function getInitialLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const preferred =
    navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of preferred) {
    const code = lang.slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

/** Збережена мова з localStorage; інакше — системна. Спільне джерело для store та i18next. */
export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return getInitialLocale();
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isLocale(parsed)) return parsed;
    }
  } catch {
    // private mode / quota / corrupt value
  }
  return getInitialLocale();
}
