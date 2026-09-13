import { ChevronDown } from "lucide-react";
import { useT } from "../lib/localeContext";
import { Section } from "../ui/Section";
import { Reveal } from "../ui/Reveal";

/** FAQ на нативних `details/summary`: розкривається без JS, індексується повністю. */
export function Faq() {
  const t = useT();
  return (
    <Section id="faq" eyebrow={t.faq.eyebrow} title={t.faq.h2} tone="muted">
      <Reveal>
        <div className="mx-auto max-w-3xl divide-y divide-border rounded-xl border border-border bg-card">
          {t.faq.items.map((item) => (
            <details key={item.q} className="group px-5 sm:px-6">
              <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring sm:py-5">
                {item.q}
                <ChevronDown className="faq-chevron h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" aria-hidden />
              </summary>
              <p className="faq-body pb-5 text-[15px] leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
