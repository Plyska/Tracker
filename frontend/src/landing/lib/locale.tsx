import type { ReactNode } from "react";
import { dictionaries, type Locale } from "../i18n";
import { LocaleContext } from "./localeContext";

/** Локаль лендінгу — з URL (`/` → en, `/uk` → uk), однакова для SSR і клієнта. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={{ locale, t: dictionaries[locale] }}>{children}</LocaleContext.Provider>;
}
