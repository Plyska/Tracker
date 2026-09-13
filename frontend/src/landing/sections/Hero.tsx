import { useRef, type CSSProperties } from "react";
import { m, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { paths } from "@/shared/config/paths";
import { useT } from "../lib/localeContext";
import { CheckinScene } from "../demo/CheckinScene";
import { Container } from "../ui/Section";
import { ButtonLink } from "../ui/primitives";

/** Виділяє «Tellday» у рядку заголовка кольором акценту — працює для обох мов. */
function Brand({ text }: { text: string }) {
  const [before, after] = text.split("Tellday");
  if (after === undefined) return <>{text}</>;
  return (
    <>
      {before}
      <span className="text-primary">Tellday</span>
      {after}
    </>
  );
}

/**
 * Герой. Текст і сітка — у HTML без JS. Скрол додає лише легкий паралакс: копі відпливає вгору,
 * демо — трохи повільніше (без пінів, без scroll-jacking).
 */
export function Hero() {
  const t = useT();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const demoY = useTransform(scrollYProgress, [0, 1], [0, 56]);

  return (
    <section ref={ref} className="relative overflow-hidden">
      <div aria-hidden className="glow-hero pointer-events-none absolute inset-0" />
      <Container className="relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14 lg:py-28">
        <m.div style={reduce ? undefined : { y: copyY }} className="flex flex-col items-start gap-6">
          <p className="rise text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">{t.hero.eyebrow}</p>
          <h1
            // clamp замість брейкпоінтів: перший рядок («Розкажи свій день.») має вміщатися в один рядок
            // на будь-якій ширині, тож розмір масштабується з колонкою, а не стрибає.
            className="rise font-display text-[clamp(2.25rem,4vw,3.5rem)] leading-[1.04] font-extrabold tracking-[-0.035em] text-balance"
            style={{ "--rise-delay": "0.08s" } as CSSProperties}
          >
            <span className="whitespace-nowrap">{t.hero.h1a}</span>
            <br />
            <Brand text={t.hero.h1b} />
          </h1>
          <p className="rise max-w-[40ch] text-lg leading-relaxed text-muted-foreground" style={{ "--rise-delay": "0.16s" } as CSSProperties}>
            {t.hero.sub}
          </p>
          <div className="rise flex flex-wrap items-center gap-3" style={{ "--rise-delay": "0.24s" } as CSSProperties}>
            <ButtonLink href={paths.register} size="lg" className="h-11 px-6 text-[15px]">
              {t.hero.cta}
            </ButtonLink>
            <ButtonLink href="#features" variant="outline" size="lg" className="h-11 px-6 text-[15px]">
              {t.hero.ctaSecondary}
            </ButtonLink>
          </div>
          <p className="rise text-sm text-muted-foreground" style={{ "--rise-delay": "0.3s" } as CSSProperties}>
            {t.hero.fine}
          </p>
        </m.div>

        <m.div style={reduce ? undefined : { y: demoY }} className="rise relative [--rise-delay:0.2s]">
          <CheckinScene />
          <p className="mt-3 text-right text-[11px] text-muted-foreground/70">{t.hero.exampleData}</p>
        </m.div>
      </Container>
    </section>
  );
}
