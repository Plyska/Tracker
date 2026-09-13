import { useEffect, useRef, useState } from "react";
import { animate, m, useInView, useMotionValue, useReducedMotion, type Variants } from "framer-motion";
import { Columns3, Rows3 } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useT } from "../lib/localeContext";
import { useHydrated } from "../lib/useHydrated";
import { Container } from "../ui/Section";
import { Reveal } from "../ui/Reveal";
import { Cell, Glyph, Surface, type CellState, type HabitKey } from "../ui/primitives";
import { withMinutes } from "../ui/habitTokens";

const TODAY = 3; // четвер
type Row = { habit: HabitKey; type: "daily" | "count" | "timed"; cells: CellState[]; badge?: string };

/** Один тиждень демо-даних (Пн–Чт заповнено, Пт–Нд майбутнє). Детерміновано — SSR = клієнт. */
const D: CellState = { kind: "done" };
const E: CellState = { kind: "empty" };
const P: CellState = { kind: "plus" };
const ROWS: Row[] = [
  { habit: "water", type: "daily", cells: [D, D, D, D] },
  { habit: "read", type: "daily", cells: [D, D, D, D] },
  { habit: "med", type: "daily", cells: [D, D, E, D] },
  { habit: "run", type: "timed", cells: [{ kind: "time", label: "45" }, P, { kind: "time", label: "25" }, { kind: "time", label: "30" }], badge: "1.7/3" },
  { habit: "gym", type: "count", cells: [D, E, D, E], badge: "2/3" },
  { habit: "english", type: "timed", cells: [{ kind: "time", label: "40" }, { kind: "time", label: "60" }, P, { kind: "time", label: "45" }], badge: "2.4/5" },
];

const cellAt = (row: Row, d: number): CellState =>
  d <= TODAY ? row.cells[d] : row.type === "timed" ? { kind: "plus" } : { kind: "empty" };

type Layout = "columns" | "rows";

/** Інтервал автоперемикання табів і пауза після ручного кліку (мс). */
const AUTO_SWITCH_MS = 4500;
const MANUAL_PAUSE_MS = 8000;

/** Поява клітинок каскадом: контейнер задає stagger, кожна клітинка — пружину. */
const gridVariants: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.012 } } };
const cellVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 520, damping: 26 } },
};

/**
 * Проблема, яку вирішуємо + таблиця тижня з перемикачем орієнтації, як у налаштуваннях застосунку:
 * «дні в колонках» (навички — рядки) ↔ «дні в рядках» (навички — колонки, RowsGrid).
 * Обидві таблиці лежать в одній клітинці grid (одна поверх іншої): висота блоку = вища з двох,
 * тож при перемиканні секція не стрибає. Перемикання — crossfade.
 */
export function Problem() {
  const t = useT();
  const reduce = useReducedMotion();
  const [layout, setLayout] = useState<Layout>("rows");
  const hydrated = useHydrated();
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { amount: 0.5 });

  // `tick` перезапускає каскадну появу клітинок: при першій появі блоку й при кожному перемиканні.
  const [tick, setTick] = useState(0);
  // Пауза після ручного кліку — у «тактах» інтервалу (без Date.now у render-функціях).
  const pauseTicks = useRef(0);
  const switchTo = (l: Layout) => {
    setLayout(l);
    setTick((n) => n + 1);
  };
  const onManual = (l: Layout) => {
    pauseTicks.current = Math.ceil(MANUAL_PAUSE_MS / AUTO_SWITCH_MS);
    switchTo(l);
  };

  // Автоперемикання, поки блок на екрані; після ручного кліку — пауза. Усі setState — з таймерів.
  useEffect(() => {
    if (!inView || reduce) return;
    const first = requestAnimationFrame(() => setTick((n) => n + 1));
    const id = setInterval(() => {
      if (pauseTicks.current > 0) {
        pauseTicks.current -= 1;
        return;
      }
      switchTo(layout === "rows" ? "columns" : "rows");
    }, AUTO_SWITCH_MS);
    return () => {
      cancelAnimationFrame(first);
      clearInterval(id);
    };
  }, [inView, reduce, layout]);

  // Ковзний pill перемикача: layout-анімацій у LazyMotion-підмножині нема, тож міряємо кнопку
  // й анімуємо x/width як motion values (без setState). До гідрації активна кнопка має статичний фон.
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pillX = useMotionValue(0);
  const pillW = useMotionValue(0);
  const measured = useRef(false);
  useEffect(() => {
    const el = btnRefs.current[layout === "columns" ? 0 : 1];
    if (!el) return;
    const move = () => {
      const tx = el.offsetLeft;
      const tw = el.offsetWidth;
      if (!measured.current || reduce) {
        pillX.set(tx);
        pillW.set(tw);
        measured.current = true;
        return;
      }
      const spring = { type: "spring", stiffness: 500, damping: 34 } as const;
      animate(pillX, tx, spring);
      animate(pillW, tw, spring);
    };
    move();
    window.addEventListener("resize", move);
    return () => window.removeEventListener("resize", move);
  }, [layout, reduce, pillX, pillW]);

  return (
    <section className="bg-muted/40 py-20 sm:py-28">
      <Container className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <Reveal className="max-w-xl">
          <p className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">{t.problem.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl leading-[1.12] font-extrabold tracking-[-0.025em] text-balance sm:text-4xl lg:text-[2.75rem]">
            {t.problem.h2}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{t.problem.p}</p>
        </Reveal>

        <Reveal>
          <div ref={sectionRef} className="flex flex-col gap-3" role="group" aria-label={t.problem.gridAria}>
            {/* Перемикач орієнтації — сегмент із акцентним pill, як у Settings */}
            <div className="flex justify-center">
              <div className="relative inline-flex rounded-lg border border-border bg-card p-1 shadow-card">
                {hydrated && (
                  <m.span
                    aria-hidden
                    style={{ x: pillX, width: pillW }}
                    className="absolute top-1 bottom-1 left-0 rounded-md bg-primary"
                  />
                )}
                {(["columns", "rows"] as Layout[]).map((l, i) => {
                  const active = layout === l;
                  const Icon = l === "columns" ? Columns3 : Rows3;
                  return (
                    <m.button
                      key={l}
                      ref={(el) => {
                        btnRefs.current[i] = el;
                      }}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onManual(l)}
                      whileTap={reduce ? undefined : { scale: 0.96 }}
                      className={cn(
                        "relative z-10 inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                        !hydrated && active && "bg-primary",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {l === "columns" ? t.problem.layoutColumns : t.problem.layoutRows}
                    </m.button>
                  );
                })}
              </div>
            </div>

            <div className="grid items-start">
              {(["columns", "rows"] as Layout[]).map((l) => {
                const active = layout === l;
                return (
                  <m.div
                    key={l}
                    initial={false}
                    animate={{ opacity: active ? 1 : 0, y: active ? 0 : 10 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
                    aria-hidden={!active}
                    className={cn("[grid-area:1/1]", !active && "pointer-events-none")}
                  >
                    {/* key={tick} перемонтовує сітку → каскад клітинок грає знову; до гідрації — без initial */}
                    <m.div
                      key={tick}
                      variants={gridVariants}
                      initial={hydrated && !reduce ? "hidden" : false}
                      animate="show"
                    >
                      {l === "columns" ? <ColumnsTable /> : <RowsTable />}
                    </m.div>
                  </m.div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/** Дні — колонки, навички — рядки (дефолтна орієнтація HabitTable). */
function ColumnsTable() {
  const t = useT();
  return (
    <Surface className="overflow-hidden px-2.5 pt-2 pb-2.5">
      <div className="grid gap-x-0.5 text-sm" style={{ gridTemplateColumns: "minmax(8.75rem, 2fr) repeat(7, minmax(1.75rem, 1fr))" }}>
        <div className="px-1.5 pt-2 pb-1.5 text-[11px] text-muted-foreground">{t.hero.habitCol}</div>
        {t.grid.days.map((d, i) => (
          <div
            key={d}
            className={cn(
              "flex flex-col items-center justify-end pt-2 pb-1.5 text-[11px] leading-none",
              i >= 5 ? "text-muted-foreground/70" : "text-muted-foreground",
              i === TODAY && "font-semibold text-primary",
            )}
          >
            <span>{d}</span>
            <span aria-hidden className={cn("mt-1.5 h-1 w-1 rounded-full", i === TODAY ? "bg-primary" : "bg-transparent")} />
          </div>
        ))}
        {ROWS.map((row) => (
          <div key={row.habit} className="contents">
            <div className="flex min-w-0 items-center gap-2 border-t border-border py-1 pr-1 pl-1.5">
              <Glyph habit={row.habit} />
              <span className="truncate text-[13px] font-medium">{t.grid.habits[row.habit]}</span>
              {row.badge && (
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] leading-4 font-medium text-muted-foreground tabular-nums">
                  {row.badge}
                </span>
              )}
            </div>
            {Array.from({ length: 7 }, (_, d) => (
              <div key={d} className="grid place-items-center border-t border-border py-1">
                <m.span variants={cellVariants} className="inline-flex">
                  <Cell habit={row.habit} state={withMinutes(cellAt(row, d), t.grid.min)} future={d > TODAY} today={d === TODAY} animated={false} />
                </m.span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Surface>
  );
}

/** Дні — рядки, навички — колонки (орієнтація RowsGrid). */
function RowsTable() {
  const t = useT();
  return (
    <Surface className="overflow-hidden">
      <div className="grid" style={{ gridTemplateColumns: "3.25rem repeat(6, minmax(0, 1fr))" }}>
        <div className="border-b border-border bg-muted" />
        {ROWS.map((row) => (
          <div key={row.habit} className="flex flex-col items-center gap-1 border-b border-l border-border bg-muted px-1 py-2">
            <Glyph habit={row.habit} className="h-7 w-7" />
            <span className="max-w-full truncate text-[11px] font-medium">{t.grid.habits[row.habit]}</span>
          </div>
        ))}
        {t.grid.days.map((day, d) => (
          <div key={day} className="contents">
            <div
              className={cn(
                "flex items-center gap-1.5 border-t border-border px-2 text-[11px] uppercase first:border-t-0",
                d >= 5 ? "text-muted-foreground/70" : "text-muted-foreground",
                d === TODAY && "font-semibold text-primary",
              )}
            >
              {day}
            </div>
            {ROWS.map((row) => (
              <div key={row.habit} className="grid place-items-center border-t border-l border-border py-1">
                <m.span variants={cellVariants} className="inline-flex">
                  <Cell habit={row.habit} state={withMinutes(cellAt(row, d), t.grid.min)} future={d > TODAY} today={d === TODAY} animated={false} />
                </m.span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Surface>
  );
}
