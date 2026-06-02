import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import uk from "./locales/uk.json";
import { getStoredLocale } from "./locale";

/**
 * Ініціалізація i18next (side-effect при імпорті у `main.tsx`).
 * Ресурси інлайнові → init синхронний, Suspense не потрібен.
 * Джерело істини для мови — `localeSlice`; `I18nProvider` синхронізує `changeLanguage`.
 */
// Додати мову: 1) новий файл locales/<code>.json; 2) рядок у resources нижче;
// 3) запис у LOCALES + тип Locale (./locale). Детекція мови браузера підхопить її сама.
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    uk: { translation: uk },
  },
  lng: getStoredLocale(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
export * from "./locale";
