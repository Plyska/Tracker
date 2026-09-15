import type { ReactNode } from "react";
import { dictionaries, type Locale, type Page } from "../i18n";
import { LocaleContext } from "./localeContext";

/** Локаль лендінгу — з URL (`/` → en, `/uk` → uk), однакова для SSR і клієнта. */
export function LocaleProvider({
  locale,
  page = "home",
  children,
}: {
  locale: Locale;
  page?: Page;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale, page, t: dictionaries[locale] }}>{children}</LocaleContext.Provider>
  );
}
