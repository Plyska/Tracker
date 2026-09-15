import { createContext, useContext } from "react";
import { dictionaries, type Dict, type Locale, type Page } from "../i18n";

export interface LocaleCtx {
  locale: Locale;
  /** Поточна сторінка — щоб перемикач мови вів на неї ж, а якорі навбара — на головну. */
  page: Page;
  t: Dict;
}

export const LocaleContext = createContext<LocaleCtx>({ locale: "en", page: "home", t: dictionaries.en });

export const useLocale = () => useContext(LocaleContext);
export const useT = () => useContext(LocaleContext).t;
