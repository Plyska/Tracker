import { LazyMotion, domAnimation } from "framer-motion";
import type { Locale, Page } from "./i18n";
import { LEGAL_DOCS, LegalPage } from "./legal";
import { LocaleProvider } from "./lib/locale";
import { Nav } from "./sections/Nav";
import { Hero } from "./sections/Hero";
import { Problem } from "./sections/Problem";
import { FeatureTour } from "./sections/FeatureTour";
import { Stats } from "./sections/Stats";
import { Companion } from "./sections/Companion";
import { Personalization } from "./sections/Personalization";
import { Pricing } from "./sections/Pricing";
import { Faq } from "./sections/Faq";
import { FinalCta, Footer } from "./sections/Footer";

/**
 * Корінь лендінгу. Без router/redux/i18next — лише локаль з URL і LazyMotion (`m.*` замість
 * `motion.*`, щоб у бандл потрапила тільки DOM-анімація, без layout/drag).
 * Той самий компонент рендериться і на клієнті (main.tsx), і в пререндері (prerender.tsx).
 */
export function LandingApp({ locale, page = "home" }: { locale: Locale; page?: Page }) {
  return (
    <LocaleProvider locale={locale} page={page}>
      <LazyMotion features={domAnimation} strict>
        {page === "home" ? (
          <>
            <Nav />
            <main id="main">
              <Hero />
              <Problem />
              <FeatureTour />
              <Stats />
              <Companion />
              <Personalization />
              <Pricing />
              <Faq />
              <FinalCta />
            </main>
            <Footer />
          </>
        ) : (
          // Юридичні документи — той самий entry (спільні Nav/Footer, токени, пререндер),
          // але без маркетингових секцій і без CTA-блоку.
          <LegalPage doc={LEGAL_DOCS[page][locale]} />
        )}
      </LazyMotion>
    </LocaleProvider>
  );
}
