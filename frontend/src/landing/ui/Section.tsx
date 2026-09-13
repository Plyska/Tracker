import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { Reveal } from "./Reveal";

/** Спільний контейнер сторінки: ширина, бокові відступи. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

/**
 * Секція лендінгу: eyebrow → h2 → lead. `tone="muted"` — приглушений фон для чергування
 * поверхонь (замість карток-на-картках).
 */
export function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
  tone = "plain",
  className,
  headClassName,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  lead?: string;
  children: ReactNode;
  tone?: "plain" | "muted";
  className?: string;
  headClassName?: string;
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-20 py-20 sm:py-28", tone === "muted" && "bg-muted/40", className)}
    >
      <Container>
        <Reveal className={cn("mb-12 max-w-2xl sm:mb-16", headClassName)}>
          <p className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">{eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl leading-[1.12] font-extrabold tracking-[-0.025em] text-balance sm:text-4xl lg:text-[2.75rem]">
            {title}
          </h2>
          {lead && <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{lead}</p>}
        </Reveal>
        {children}
      </Container>
    </section>
  );
}
