import { m, useReducedMotion } from "framer-motion";
import { Check, Lock } from "lucide-react";
import { paths } from "@/shared/config/paths";
import { cn } from "@/shared/lib/cn";
import { useT } from "../lib/localeContext";
import { Section } from "../ui/Section";
import { Reveal } from "../ui/Reveal";
import { ButtonLink, Pill, Surface } from "../ui/primitives";

/** Два тарифи: Free — активний, Pro — «пізніше», задизейблений. */
export function Pricing() {
  const t = useT();
  const reduce = useReducedMotion();
  return (
    <Section id="pricing" eyebrow={t.pricing.eyebrow} title={t.pricing.h2}>
      <div className="grid gap-4 md:grid-cols-2">
        <Reveal>
          <m.div whileHover={reduce ? undefined : { y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className="h-full">
            <Surface className="flex h-full flex-col gap-6 border-primary/40 p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <span className="font-display text-xl font-bold">{t.pricing.free.name}</span>
                <Pill className="bg-accent text-accent-foreground">{t.pricing.free.period}</Pill>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-6xl leading-none font-extrabold tracking-[-0.04em] tabular-nums">{t.pricing.free.price}</span>
              </div>
              <FeatureList items={t.pricing.free.features} />
              <ButtonLink href={paths.register} size="lg" className="mt-auto h-11 w-full text-[15px]">
                {t.pricing.free.cta}
              </ButtonLink>
            </Surface>
          </m.div>
        </Reveal>

        <Reveal delay={0.08}>
          <Surface aria-disabled className="flex h-full flex-col gap-6 p-6 opacity-60 saturate-50 sm:p-8">
            <div className="flex items-center justify-between">
              <span className="font-display text-xl font-bold">{t.pricing.pro.name}</span>
              <Pill>
                <Lock className="mr-1 h-3 w-3" aria-hidden />
                {t.pricing.pro.badge}
              </Pill>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-6xl leading-none font-extrabold tracking-[-0.04em]">{t.pricing.pro.price}</span>
              {t.pricing.pro.period && <span className="text-muted-foreground">{t.pricing.pro.period}</span>}
            </div>
            <FeatureList items={t.pricing.pro.features} muted />
            <span
              aria-disabled
              className="mt-auto inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-md border border-border text-[15px] font-medium text-muted-foreground"
            >
              {t.pricing.pro.cta}
            </span>
          </Surface>
        </Reveal>
      </div>
    </Section>
  );
}

function FeatureList({ items, muted }: { items: string[]; muted?: boolean }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((f) => (
        <li key={f} className={cn("flex items-start gap-2.5 text-[15px]", muted && "text-muted-foreground")}>
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
            <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
          </span>
          {f}
        </li>
      ))}
    </ul>
  );
}
