import { createContext, useContext } from "react";
import { dictionaries, type Dict, type Locale } from "../i18n";

export interface LocaleCtx {
  locale: Locale;
  t: Dict;
}

export const LocaleContext = createContext<LocaleCtx>({ locale: "en", t: dictionaries.en });

export const useLocale = () => useContext(LocaleContext);
export const useT = () => useContext(LocaleContext).t;
