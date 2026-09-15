import type { ReactNode } from "react";
import { useLocale } from "../lib/localeContext";
import { Nav } from "../sections/Nav";
import { Footer } from "../sections/Footer";
import { Container } from "../ui/Section";
import type { LegalBlock, LegalDoc } from "./types";

/**
 * Сторінка юридичного документа (`/privacy`, `/terms` і `/uk/...`).
 *
 * Свідомо без анімацій і без `Reveal`: документ мають прочитати без JS (пререндер), його
 * індексують, на нього посилаються з форми реєстрації — жодного стану, який залежить від
 * гідрації. Верстка — звичайні `p`/`ul`/`table` з утилітами: плагіна typography в проєкті немає,
 * а заводити його заради двох сторінок не варто.
 */

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

/** `**жирний**` і `[текст](url)` — усе, що дозволено всередині абзацу. */
function inline(text: string): ReactNode[] {
  return text
    .split(INLINE)
    .filter(Boolean)
    .map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
      if (link) {
        return (
          <a key={i} href={link[2]} className="text-primary underline underline-offset-4 hover:text-primary/80">
            {link[1]}
          </a>
        );
      }
      return part;
    });
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") {
    return <p className="my-4 text-[15px] leading-7 text-foreground/90">{inline(block)}</p>;
  }
  if ("list" in block) {
    return (
      <ul className="my-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-foreground/90 marker:text-muted-foreground">
        {block.list.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </ul>
    );
  }
  return (
    // Таблиця — єдине, чому дозволено бути ширшим за колонку; скрол лише в неї, не в сторінку.
    <div className="my-5 overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50 text-left">
            {block.table.head.map((h) => (
              <th key={h} className="px-3 py-2.5 font-semibold text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.table.rows.map((row, r) => (
            <tr key={r} className="border-t border-border align-top">
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={c === 0 ? "px-3 py-2.5 font-medium whitespace-nowrap text-foreground" : "px-3 py-2.5 leading-6 text-foreground/90"}
                >
                  {inline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const { t } = useLocale();
  return (
    <>
      <Nav />
      <main id="main" className="py-14 sm:py-20">
        <Container className="max-w-3xl">
          <header className="mb-10">
            <p className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">{t.legal.eyebrow}</p>
            <h1 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{doc.title}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {t.legal.updated}: <time>{doc.updated}</time>
            </p>
            <p className="mt-6 text-base leading-7 text-foreground/90">{doc.lead}</p>
          </header>

          <nav aria-label={t.legal.contents} className="mb-12 rounded-lg border border-border bg-muted/30 p-5">
            <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">{t.legal.contents}</p>
            <ol className="mt-3 columns-1 gap-x-8 space-y-1.5 text-sm sm:columns-2">
              {doc.sections.map((s, i) => (
                <li key={s.id} className="break-inside-avoid">
                  <a href={`#${s.id}`} className="text-foreground/80 no-underline hover:text-primary">
                    <span className="mr-2 tabular-nums text-muted-foreground">{i + 1}.</span>
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {doc.sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 border-t border-border py-8 first-of-type:border-t-0">
              <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                <span className="mr-2 text-muted-foreground tabular-nums">{i + 1}.</span>
                {s.heading}
              </h2>
              {s.body.map((b, j) => (
                <Block key={j} block={b} />
              ))}
            </section>
          ))}
        </Container>
      </main>
      <Footer />
    </>
  );
}
