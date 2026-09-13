import { useState, type PointerEvent } from "react";
import { m, useReducedMotion } from "framer-motion";
import { Check, Clock } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useT } from "../lib/localeContext";
import { Cell, Glyph, Pill, Surface, type CellState, type HabitKey } from "../ui/primitives";
import { MOOD_ICONS, withMinutes } from "../ui/habitTokens";

/* ---------- 1. Типи навичок ---------- */

const TYPE_ROWS: { habit: HabitKey; type: "daily" | "weekly" | "timed"; cells: CellState[]; badge?: string }[] = [
  {
    habit: "read",
    type: "daily",
    cells: [{ kind: "done" }, { kind: "done" }, { kind: "done" }, { kind: "done" }, { kind: "empty" }, { kind: "empty" }, { kind: "empty" }],
  },
  {
    habit: "gym",
    type: "weekly",
    cells: [{ kind: "done" }, { kind: "empty" }, { kind: "done" }, { kind: "empty" }, { kind: "empty" }, { kind: "empty" }, { kind: "empty" }],
    badge: "2/3",
  },
  {
    habit: "english",
    type: "timed",
    cells: [
      { kind: "time", label: "40" },
      { kind: "time", label: "60" },
      { kind: "plus" },
      { kind: "time", label: "90" },
      { kind: "plus" },
      { kind: "plus" },
      { kind: "plus" },
    ],
    badge: "3.2/5",
  },
];

export function HabitTypesDemo() {
  const t = useT();
  return (
    <Surface className="overflow-hidden px-2 pt-1.5 pb-2">
      <div className="grid gap-x-0.5" style={{ gridTemplateColumns: "minmax(9rem, 1.8fr) repeat(7, minmax(1.75rem, 1fr))" }}>
        <div className="px-1.5 pt-2 pb-1.5 text-[11px] text-muted-foreground">{t.hero.habitCol}</div>
        {t.grid.days.map((d, i) => (
          <div key={d} className={cn("pt-2 pb-1.5 text-center text-[11px]", i >= 5 ? "text-muted-foreground/70" : "text-muted-foreground")}>
            {d}
          </div>
        ))}
        {TYPE_ROWS.map((row) => (
          <RowFragment key={row.habit} row={row} name={t.grid.habits[row.habit]} typeLabel={t.features.types[row.type]} minUnit={t.grid.min} />
        ))}
      </div>
    </Surface>
  );
}

function RowFragment({
  row,
  name,
  typeLabel,
  minUnit,
}: {
  row: (typeof TYPE_ROWS)[number];
  name: string;
  typeLabel: string;
  minUnit: string;
}) {
  return (
    <>
      <div className="flex min-w-0 items-center gap-2 border-t border-border py-1 pr-1 pl-1.5">
        <Glyph habit={row.habit} />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[13px] font-medium">{name}</span>
          <span className="text-[10px] text-muted-foreground">{typeLabel}</span>
        </span>
        {row.badge && <Pill className="ml-auto">{row.badge}</Pill>}
      </div>
      {row.cells.map((c, d) => (
        <div key={d} className="grid place-items-center border-t border-border py-1">
          <Cell habit={row.habit} state={withMinutes(c, minUnit)} future={d > 3} animated={false} />
        </div>
      ))}
    </>
  );
}

/* ---------- 2. Настрій ---------- */

/**
 * Пікер настрою, що реагує на курсор: найближче обличчя трохи піднімається (spring), клік
 * обирає. На тачі — просто тап. Під reduced-motion лишається лише вибір без руху.
 */
export function MoodDemo() {
  const t = useT();
  const reduce = useReducedMotion();
  const [value, setValue] = useState(4);
  const [near, setNear] = useState<number | null>(null);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const idx = Math.min(4, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * 5)));
    setNear(idx);
  };

  return (
    <Surface className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{t.hero.moodQuestion}</span>
        <div onPointerMove={onMove} onPointerLeave={() => setNear(null)} className="flex items-center gap-0.5">
          {MOOD_ICONS.map((Icon, i) => {
            const v = i + 1;
            const active = value === v;
            return (
              <m.button
                key={v}
                type="button"
                aria-pressed={active}
                aria-label={t.features.moodLabels[i]}
                onClick={() => setValue(v)}
                animate={reduce ? undefined : { y: near === i ? -4 : 0, scale: near === i ? 1.12 : 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 26 }}
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </m.button>
            );
          })}
        </div>
      </div>
      <p className="text-sm font-medium">{t.features.moodLabels[value - 1]}</p>
      <div className="flex items-center gap-3 rounded-lg bg-accent px-3.5 py-2.5 text-sm text-accent-foreground">
        <Glyph habit="run" className="h-5 w-5 rounded-[5px]" />
        <span>{t.features.moodHint}</span>
      </div>
    </Surface>
  );
}

/* ---------- 3. Щоденник ---------- */

export function DiaryDemo() {
  const t = useT();
  const moods = [4, 2, 5];
  return (
    <div className="grid gap-3">
      {t.features.diary.map((entry, i) => {
        const Icon = MOOD_ICONS[moods[i] - 1];
        return (
          <Surface key={entry.day} className={cn("flex flex-col gap-2 p-4", i === 2 && "hidden sm:flex")}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{entry.day}</span>
              <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-accent text-accent-foreground">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{entry.text}</p>
          </Surface>
        );
      })}
    </div>
  );
}

/* ---------- 4. План дня ---------- */

export function PlannerDemo() {
  const t = useT();
  const [done, setDone] = useState<boolean[]>([true, false, false]);
  return (
    <Surface className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{t.features.planner.title}</span>
        <Pill>
          {done.filter(Boolean).length}/{done.length}
        </Pill>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {t.features.planner.tasks.map((task, i) => (
          <li key={task.title} className="flex items-center gap-3 py-2.5">
            <button
              type="button"
              aria-pressed={done[i]}
              aria-label={task.title}
              onClick={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                done[i] ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent",
              )}
            >
              {done[i] && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </button>
            <span className={cn("flex min-w-0 flex-1 flex-col", done[i] && "text-muted-foreground line-through decoration-border")}>
              <span className="truncate text-sm font-medium">{task.title}</span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
                <Clock className="h-3 w-3" aria-hidden />
                {task.time ?? t.features.planner.untimed}
              </span>
            </span>
            {task.habit && (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Glyph habit="run" className="h-5 w-5 rounded-[5px]" />
                {task.habit}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Surface>
  );
}
