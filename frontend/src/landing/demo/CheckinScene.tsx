import { useEffect, useMemo, useRef, useState } from "react";
import { m, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useT } from "../lib/localeContext";
import { Cell, Glyph, MoodFaces, Pill, Surface, type CellState, type HabitKey } from "../ui/primitives";
import { withMinutes } from "../ui/habitTokens";

/**
 * Сцена героя: речення чек-іну друкується, і кожен фрагмент «лягає» в сітку сьогоднішнього дня.
 *
 * Стан сцени — одне число `typed` (скільки символів надруковано): усе інше (підсвічені фрагменти,
 * заповнені клітинки, настрій, репліка) виводиться з нього. Початковий стан = ФІНАЛЬНИЙ, тому
 * пререндер, no-JS і reduced-motion бачать заповнену сцену, а не порожню.
 * Цикл крутиться лише коли сцена у viewport.
 */

const TODAY = 3; // четвер: Пн–Ср відмічено, Пт–Нд майбутнє

type Row = { habit: HabitKey; type: "daily" | "count" | "timed"; past: CellState[]; badge?: string };

const ROWS: Row[] = [
  { habit: "water", type: "daily", past: [{ kind: "done" }, { kind: "done" }, { kind: "empty" }] },
  { habit: "read", type: "daily", past: [{ kind: "done" }, { kind: "done" }, { kind: "empty" }] },
  { habit: "med", type: "daily", past: [{ kind: "empty" }, { kind: "done" }, { kind: "done" }] },
  {
    habit: "run",
    type: "timed",
    past: [{ kind: "time", label: "45" }, { kind: "plus" }, { kind: "plus" }],
    badge: "1.25/3",
  },
  { habit: "gym", type: "count", past: [{ kind: "empty" }, { kind: "empty" }, { kind: "done" }], badge: "1/3" },
];

type StepKey = "run" | "read" | "med" | "mood";
const ORDER: StepKey[] = ["run", "read", "med", "mood"];

export function CheckinScene({ className }: { className?: string }) {
  const t = useT();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });

  // Фрагменти речення й їхні кумулятивні межі.
  const steps = useMemo(
    () =>
      ORDER.reduce<{ key: StepKey; text: string; end: number }[]>((acc, key) => {
        const text = t.hero.sentence[key];
        const prev = acc.length ? acc[acc.length - 1].end : 0;
        return [...acc, { key, text, end: prev + text.length }];
      }, []),
    [t],
  );
  const total = steps[steps.length - 1].end;

  // Анімація живе лише коли сцена на екрані й рух дозволено; інакше показуємо фінальний стан.
  const active = !reduce && inView;
  const [typedState, setTyped] = useState(total);
  const [repliedState, setReplied] = useState(true);

  // Цикл: старт при появі у viewport, повтор кожні ~9 с. Усі setState — з таймерів, не з тіла ефекту.
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const play = () => {
      if (cancelled) return;
      setTyped(0);
      setReplied(false);
      let n = 0;
      const tick = () => {
        if (cancelled) return;
        n += 1;
        setTyped(n);
        if (n >= total) {
          timer = setTimeout(() => setReplied(true), 500);
          return;
        }
        // Пауза після завершеного фрагмента — щоб клітинка «лягла» окремим тактом.
        const atBoundary = steps.some((s) => s.end === n);
        timer = setTimeout(tick, atBoundary ? 420 : 34 + Math.random() * 30);
      };
      timer = setTimeout(tick, 500);
    };
    timer = setTimeout(play, 300);
    const loop = setInterval(play, 9500);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      clearInterval(loop);
    };
  }, [active, steps, total]);

  const typed = active ? typedState : total;
  const replied = active ? repliedState : true;

  const done = (key: StepKey) => typed >= steps.find((s) => s.key === key)!.end;

  const todayState = (row: Row): CellState => {
    if (row.habit === "run") return done("run") ? { kind: "time", label: t.hero.minutesChip } : { kind: "plus" };
    if (row.habit === "read") return done("read") ? { kind: "done" } : { kind: "empty" };
    return { kind: "empty" };
  };

  return (
    <div ref={ref} className={cn("flex flex-col gap-3", className)} aria-label={t.hero.demoAria} role="group">
      {/* Рядок чек-іну */}
      {/* Підпис — окремим рядком над полем, щоб речення вміщалось в один рядок обома мовами. */}
      <Surface className="flex flex-col gap-1 px-3.5 py-2.5">
        <span className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
          {t.hero.demoLabel}
        </span>
        <div className="flex items-center gap-3">
        <p className="min-h-6 flex-1 text-[15px] leading-6" aria-live="off">
          {steps.map((s, i) => {
            const start = i === 0 ? 0 : steps[i - 1].end;
            const shown = Math.max(0, Math.min(s.text.length, typed - start));
            const complete = typed >= s.end;
            return (
              <span
                key={s.key}
                className={cn(
                  complete &&
                    "text-accent-foreground underline decoration-primary/40 decoration-2 underline-offset-[3px]",
                )}
              >
                {s.text.slice(0, shown)}
              </span>
            );
          })}
          {typed < total && (
            <span aria-hidden className="caret-blink ml-px inline-block h-[1.1em] w-0.5 translate-y-[3px] bg-primary" />
          )}
        </p>
        <span
          aria-hidden
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"
        >
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </span>
        </div>
      </Surface>

      {/* Сітка «навички × дні» */}
      <Surface className="overflow-hidden px-2 pb-2 pt-1.5">
        <div
          className="grid gap-x-0.5 text-sm"
          style={{ gridTemplateColumns: "minmax(8.75rem, 2fr) repeat(7, minmax(1.75rem, 1fr))" }}
        >
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
              <span
                aria-hidden
                className={cn("mt-1.5 h-1 w-1 rounded-full", i === TODAY ? "bg-primary" : "bg-transparent")}
              />
            </div>
          ))}

          {ROWS.map((row) => (
            <RowView key={row.habit} row={row} todayState={todayState(row)} name={t.grid.habits[row.habit]} minUnit={t.grid.min} />
          ))}
        </div>
      </Surface>

      {/* Настрій */}
      <Surface className="flex items-center gap-3 px-3.5 py-2">
        <span className="text-sm text-muted-foreground">{t.hero.moodQuestion}</span>
        <MoodFaces
          className="ml-auto"
          size="sm"
          labels={t.features.moodLabels}
          value={done("mood") ? 3 : undefined}
        />
      </Surface>

      {/* Репліка помічника: одне речення й питання, не порада */}
      <m.div
        initial={false}
        animate={{ opacity: replied ? 1 : 0, y: replied ? 0 : 6 }}
        transition={reduce ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
        className="rounded-r-lg border-l-[3px] border-primary bg-accent px-3.5 py-2.5 text-sm"
        aria-hidden={!replied}
      >
        <span className="mb-0.5 block text-[11px] font-semibold tracking-[0.06em] text-accent-foreground uppercase">
          {t.hero.companion}
        </span>
        {t.hero.reply}
      </m.div>
    </div>
  );
}

function RowView({ row, todayState, name, minUnit }: { row: Row; todayState: CellState; name: string; minUnit: string }) {
  return (
    <>
      <div className="flex min-w-0 items-center gap-2 border-t border-border py-1 pr-1 pl-1.5">
        <Glyph habit={row.habit} />
        <span className="truncate text-[13px] font-medium">{name}</span>
        {row.badge && <Pill className="ml-auto">{row.badge}</Pill>}
      </div>
      {Array.from({ length: 7 }, (_, d) => {
        let state: CellState;
        if (d < TODAY) state = withMinutes(row.past[d], minUnit);
        else if (d === TODAY) state = todayState;
        else state = row.type === "timed" ? { kind: "plus" } : { kind: "empty" };
        return (
          <div key={d} className="grid place-items-center border-t border-border py-1">
            <Cell habit={row.habit} state={state} future={d > TODAY} today={d === TODAY} />
          </div>
        );
      })}
    </>
  );
}
