import { LazyMotion, domAnimation } from "framer-motion";
import type { Locale } from "./i18n";
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
export function LandingApp({ locale }: { locale: Locale }) {
  return (
    <LocaleProvider locale={locale}>
      <LazyMotion features={domAnimation} strict>
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
      </LazyMotion>
    </LocaleProvider>
  );
}
