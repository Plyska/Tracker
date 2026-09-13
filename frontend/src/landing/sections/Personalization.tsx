import { useState } from "react";
import { paths } from "@/shared/config/paths";
import { cn } from "@/shared/lib/cn";
import { dictionaries, type Locale } from "../i18n";
import { useLocale } from "../lib/localeContext";
import { Section } from "../ui/Section";
import { Reveal } from "../ui/Reveal";
import { ButtonLink, Cell, Glyph, Surface, type CellState, type HabitKey } from "../ui/primitives";
import { withMinutes } from "../ui/habitTokens";

type Accent = "violet" | "emerald" | "blue" | "orange";
const ACCENTS: { key: Accent; dot: string }[] = [
  { key: "violet", dot: "bg-[#6d28d9]" },
  { key: "emerald", dot: "bg-[#059669]" },
  { key: "blue", dot: "bg-[#2563eb]" },
  { key: "orange", dot: "bg-[#ea580c]" },
];

const ROWS: { habit: HabitKey; cells: CellState[] }[] = [
  { habit: "read", cells: [{ kind: "done" }, { kind: "done" }, { kind: "empty" }, { kind: "done" }, { kind: "empty" }] },
  { habit: "run", cells: [{ kind: "time", label: "30" }, { kind: "plus" }, { kind: "time", label: "45" }, { kind: "plus" }, { kind: "plus" }] },
  { habit: "med", cells: [{ kind: "empty" }, { kind: "done" }, { kind: "done" }, { kind: "done" }, { kind: "empty" }] },
];

/**
 * Персоналізація: одна картка сітки, розрізана на світлу й темну половини. Акцент перефарбовує
 * обидві через `data-accent` (ті самі токени, що в застосунку), мова міняє тексти всередині картки.
 * Локальний стан — лише для демо, глобальну тему не чіпає.
 */
export function Personalization() {
  const { t, locale } = useLocale();
  const [accent, setAccent] = useState<Accent>("violet");
  const [lang, setLang] = useState<Locale>(locale);

  return (
    <Section eyebrow={t.personalization.eyebrow} title={t.personalization.h2} lead={t.personalization.p} tone="muted">
      <Reveal>
        <div className="flex flex-col gap-5">
          <div className="grid overflow-hidden rounded-xl border border-border shadow-card md:grid-cols-2">
            <Half theme="light" accent={accent} label={t.personalization.light} lang={lang} />
            <Half theme="dark" accent={accent} label={t.personalization.dark} lang={lang} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div data-accent={accent === "violet" ? undefined : accent} role="group" aria-label="Accent" className="flex flex-wrap gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  aria-pressed={accent === a.key}
                  onClick={() => setAccent(a.key)}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    accent === a.key ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card hover:bg-accent",
                  )}
                >
                  <span aria-hidden className={cn("h-3 w-3 rounded-full", a.dot)} />
                  {t.personalization.accents[a.key]}
                </button>
              ))}
            </div>
            <div role="group" aria-label="Language" className="ml-auto inline-flex overflow-hidden rounded-md border border-border bg-card">
              {(["en", "uk"] as Locale[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={lang === l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "h-9 px-3 text-xs font-semibold uppercase transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/** Половина картки. `data-accent` стоїть на тому ж елементі, що й `.dark`, бо селектор темного
 *  акценту в токенах — `.dark[data-accent=…]` (один елемент, вища специфічність). */
function Half({ theme, accent, label, lang }: { theme: "light" | "dark"; accent: Accent; label: string; lang: Locale }) {
  const d = dictionaries[lang];
  return (
    <div
      data-accent={accent === "violet" ? undefined : accent}
      // `.light`/`.dark` на самій половині: інакше світла половина успадкувала б темні токени з <html>.
      className={cn(theme === "dark" ? "dark" : "light", "bg-background p-4 text-foreground sm:p-6")}
    >
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className={cn("h-2 w-2 rounded-full", theme === "dark" ? "bg-foreground/70" : "bg-primary")} aria-hidden />
        {label}
      </div>
      <Surface className="overflow-hidden px-2 pt-1.5 pb-2">
        <div className="grid gap-x-0.5" style={{ gridTemplateColumns: "minmax(6.5rem, 1.6fr) repeat(5, minmax(1.75rem, 1fr))" }}>
          <div className="px-1.5 pt-2 pb-1.5 text-[11px] text-muted-foreground">{d.hero.habitCol}</div>
          {d.grid.days.slice(0, 5).map((day, i) => (
            <div key={day} className={cn("pt-2 pb-1.5 text-center text-[11px]", i === 3 ? "font-semibold text-primary" : "text-muted-foreground")}>
              {day}
            </div>
          ))}
          {ROWS.map((row) => (
            <RowFragment key={row.habit} row={row} name={d.grid.habits[row.habit]} minUnit={d.grid.min} />
          ))}
        </div>
      </Surface>
      <div className="mt-3 flex items-center gap-2">
        <ButtonLink href={paths.register} size="sm" className="text-xs">
          {d.nav.start}
        </ButtonLink>
        <ButtonLink href={paths.login} variant="outline" size="sm" className="text-xs">
          {d.nav.login}
        </ButtonLink>
      </div>
    </div>
  );
}

function RowFragment({ row, name, minUnit }: { row: (typeof ROWS)[number]; name: string; minUnit: string }) {
  return (
    <>
      <div className="flex min-w-0 items-center gap-2 border-t border-border py-1 pr-1 pl-1.5">
        <Glyph habit={row.habit} />
        <span className="truncate text-[13px] font-medium">{name}</span>
      </div>
      {row.cells.map((c, i) => (
        <div key={i} className="grid place-items-center border-t border-border py-1">
          <Cell habit={row.habit} state={withMinutes(c, minUnit)} today={i === 3} future={i > 3} animated={false} />
        </div>
      ))}
    </>
  );
}
