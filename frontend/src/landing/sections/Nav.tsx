import { useState } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { paths } from "@/shared/config/paths";
import { cn } from "@/shared/lib/cn";
import { BrandBadge } from "@/shared/ui/BrandMark";
import { localePath } from "../i18n";
import { useLocale } from "../lib/localeContext";
import { applyTheme, readTheme, useTheme, type Theme } from "../lib/theme";
import { Container } from "../ui/Section";
import { ButtonLink } from "../ui/primitives";

/** Логотип: знак «колонка дня» у плашці + Manrope-вордмарк. */
export function Logo({ className }: { className?: string }) {
  const { locale } = useLocale();
  return (
    <a href={localePath(locale)} className={cn("inline-flex items-center gap-2 no-underline", className)} aria-label="Tellday">
      <BrandBadge />
      <span className="font-display text-lg font-extrabold tracking-[-0.02em] text-foreground">Tellday</span>
    </a>
  );
}

/**
 * Sticky-навбар. Тема — той самий ключ localStorage, що в застосунку; мова — посилання на
 * дзеркальну сторінку (`/` ↔ `/uk`), бо мови — це окремі URL для SEO, а не стан.
 */
export function Nav() {
  const { locale, t } = useLocale();
  const other = locale === "en" ? "uk" : "en";
  // На сервері теми немає (null → іконка місяця); на клієнті — з класу на <html>.
  const theme = useTheme();
  // Після скролу навбар «відділяється» від сторінки: рамка + тінь (setState — з колбеку скролу).
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  const toggle = () => {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
  };

  const anchors = [
    ["#features", t.nav.features],
    ["#companion", t.nav.companion],
    ["#pricing", t.nav.pricing],
    ["#faq", t.nav.faq],
  ] as const;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md transition-[border-color,box-shadow] duration-300",
        scrolled ? "border-border shadow-card" : "border-transparent",
      )}
    >
      <a
        href="#main"
        className="sr-only rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        {t.nav.skip}
      </a>
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Sections" className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {anchors.map(([href, label]) => (
            <a key={href} href={href} className="no-underline transition-colors hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <a
            href={localePath(other)}
            hrefLang={other}
            lang={other}
            aria-label={t.nav.lang}
            title={t.nav.lang}
            className="grid h-9 min-w-9 place-items-center rounded-md px-2 text-xs font-semibold text-muted-foreground no-underline transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {t.nav.langShort}
          </a>
          <button
            type="button"
            onClick={toggle}
            aria-label={t.nav.theme}
            title={t.nav.theme}
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* До гідрації — сонце для обох станів; фактичну іконку ставимо після readTheme. */}
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <ButtonLink href={paths.login} variant="ghost" size="sm" className="hidden sm:inline-flex">
            {t.nav.login}
          </ButtonLink>
          <ButtonLink href={paths.register} size="sm">
            {t.nav.start}
          </ButtonLink>
        </div>
      </Container>
    </header>
  );
}
