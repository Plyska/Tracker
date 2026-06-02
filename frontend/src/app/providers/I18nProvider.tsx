import { useLayoutEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/app/store/hooks";

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useAppSelector((s) => s.locale.value);
  const { i18n } = useTranslation();

  useLayoutEffect(() => {
    if (i18n.language !== locale) void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
  }, [i18n, locale]);

  return children;
}
