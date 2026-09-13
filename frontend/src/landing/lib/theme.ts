/**
 * Тема лендінгу. Ключ і формат — ті самі, що в застосунку (`app/store`: значення напряму,
 * `"dark"`/`"light"` через JSON), тож вибір на лендінгу переживає перехід у продукт, а FOUC-скрипт
 * у landing.html читає його до першого рендеру. У застосунку джерело істини — БД; для гостя
 * localStorage — єдине, що є.
 */
import { useSyncExternalStore } from "react";

const THEME_KEY = "tracker-theme";

export type Theme = "light" | "dark";

export const readTheme = (): Theme =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

/** Підписка на клас `dark` на <html> — єдине джерело істини про тему на сторінці. */
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
};

/** Поточна тема; `null` на сервері й у гідраційному рендері (іконка перемикача ставиться після). */
export const useTheme = (): Theme | null =>
  useSyncExternalStore(subscribe, readTheme, () => null);

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  } catch {
    /* приватний режим / вимкнене сховище — тема живе до перезавантаження */
  }
}
