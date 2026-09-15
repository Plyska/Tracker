import { paths } from "@/shared/config/paths";
import { pagePath } from "../i18n";
import { useLocale } from "../lib/localeContext";
import { Container } from "../ui/Section";
import { Reveal } from "../ui/Reveal";
import { ButtonLink } from "../ui/primitives";
import { Logo } from "./Nav";

/** Фінальний заклик: повтор речення з героя, одна кнопка, лінк на вхід. */
export function FinalCta() {
  const { t } = useLocale();
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div aria-hidden className="glow-hero pointer-events-none absolute inset-0 rotate-180" />
      <Container className="relative">
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <h2 className="font-display text-4xl leading-[1.05] font-extrabold tracking-[-0.035em] text-balance sm:text-5xl">
            {t.cta.h2}
          </h2>
          <p className="text-lg text-muted-foreground">{t.cta.p}</p>
          <ButtonLink href={paths.register} size="lg" className="h-12 px-8 text-base">
            {t.cta.button}
          </ButtonLink>
          <a href={paths.login} className="text-sm text-muted-foreground no-underline hover:text-foreground">
            {t.cta.login}
          </a>
        </Reveal>
      </Container>
    </section>
  );
}

export function Footer() {
  const { t, locale, page } = useLocale();
  const other = locale === "en" ? "uk" : "en";
  return (
    <footer className="border-t border-border py-10">
      <Container className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="text-sm text-muted-foreground">{t.footer.tagline}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <a href={paths.login} className="no-underline hover:text-foreground">{t.footer.login}</a>
          <a href={paths.register} className="no-underline hover:text-foreground">{t.footer.register}</a>
          <a href={pagePath(locale, "privacy")} className="no-underline hover:text-foreground">
            {t.legal.privacy}
          </a>
          <a href={pagePath(locale, "terms")} className="no-underline hover:text-foreground">
            {t.legal.terms}
          </a>
          <a href={pagePath(other, page)} hrefLang={other} lang={other} className="no-underline hover:text-foreground">
            {t.nav.lang}
          </a>
          <span className="text-muted-foreground/70">{t.footer.made}</span>
          <span className="text-muted-foreground/70 tabular-nums">© {new Date().getFullYear()} {t.footer.rights}</span>
        </nav>
      </Container>
    </footer>
  );
}
