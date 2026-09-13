import { useRef, useState, type ReactNode } from "react";
import { useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, CalendarDays, HeartPulse, Waypoints, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useT } from "../lib/localeContext";
import { Section } from "../ui/Section";
import { Reveal } from "../ui/Reveal";
import { CountUp } from "../ui/CountUp";
import { Glyph, Surface, type HabitKey } from "../ui/primitives";
import { MOOD_ICONS } from "../ui/habitTokens";

const WEEKS = 53;
/** Блоки статистики з'являються лише коли доскролено до нижньої третини екрана — по черзі, не всі разом. */
const STAGE_MARGIN = "0px 0px -32% 0px";

/** Детермінований «рік»: частка виконання на день із легким зростанням до кінця й тихішими вихідними. */
function ratioAt(week: number, day: number): number {
  const i = week * 7 + day;
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  const noise = x - Math.floor(x);
  const trend = 0.18 + 0.22 * (week / WEEKS);
  const weekend = day >= 5 ? -0.18 : 0;
  return Math.max(0, Math.min(1, noise * 0.72 + trend + weekend));
}

/** Рівні як у Heatmap застосунку (5 ступенів акценту). */
function levelClass(r: number): string {
  if (r < 0.12) return "bg-accent/60";
  if (r <= 0.3) return "bg-primary/25";
  if (r <= 0.5) return "bg-primary/45";
  if (r <= 0.72) return "bg-primary/70";
  return "bg-primary";
}

/** Профіль тижня: частка виконання Пн–Нд (демо). Найкращий — сб, найслабший — ср. */
const WEEKDAY_PCT = [71, 68, 56, 74, 66, 83, 70];
const BEST = 83;
const WORST = 56;
const MOVERS: { habit: HabitKey; delta: number }[] = [
  { habit: "med", delta: 15 },
  { habit: "run", delta: 8 },
  { habit: "guitar", delta: -21 },
  { habit: "english", delta: -19 },
];

/**
 * Статистика: шість метрик (з'являються по черзі, дораховуються при появі), річний heatmap
 * (колонки проявляються за скролом), профіль тижня, movers, синергія, настрій ↔ звички — та сама
 * сітка віджетів, що на сторінці Statistics застосунку. Початковий стан — повний (SSR/no-JS/reduced-motion).
 */
export function Stats() {
  const t = useT();
  const reduce = useReducedMotion();
  const heatRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heatRef, offset: ["start 95%", "start 30%"] });
  const weeksMv = useTransform(scrollYProgress, [0, 1], [6, WEEKS]);
  const [weeks, setWeeks] = useState(WEEKS);
  useMotionValueEvent(weeksMv, "change", (v) => {
    if (!reduce) setWeeks(Math.round(v));
  });

  const M = t.stats.metrics;
  const metrics: { label: string; value: ReactNode; sub?: ReactNode }[] = [
    { label: M.completion, value: <CountUp to={78} format={(v) => `${Math.round(v)}%`} />, sub: <Delta value={4} unit="%" /> },
    { label: M.currentStreak, value: <CountUp to={12} />, sub: M.days },
    { label: M.longestStreak, value: <CountUp to={34} />, sub: M.days },
    { label: M.perfect, value: <CountUp to={19} />, sub: <Delta value={3} /> },
    {
      label: M.bestHabit,
      value: (
        <span className="flex items-center gap-2 text-xl sm:text-2xl">
          <Glyph habit="read" />
          {t.grid.habits.read}
        </span>
      ),
      sub: "91%",
    },
    { label: M.mood, value: <CountUp to={3.8} format={(v) => v.toFixed(1)} />, sub: <Delta value={0.2} /> },
  ];

  return (
    <Section eyebrow={t.stats.eyebrow} title={t.stats.h2} lead={t.stats.p} tone="muted">
      <div className="flex flex-col gap-4">
        {/* Метрики */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {metrics.map((mtr, i) => (
            <Reveal key={mtr.label} delay={i * 0.1} margin={STAGE_MARGIN} y={24}>
              <Surface className="flex h-full flex-col gap-1.5 px-4 py-3.5">
                <span className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">{mtr.label}</span>
                <span className="font-display text-2xl leading-none font-extrabold tracking-tight tabular-nums sm:text-3xl">{mtr.value}</span>
                {mtr.sub && <span className="text-xs text-muted-foreground">{mtr.sub}</span>}
              </Surface>
            </Reveal>
          ))}
        </div>

        {/* Heatmap */}
        <Reveal margin={STAGE_MARGIN} y={24}>
          <Surface className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">{t.stats.heatmap.title}</span>
              <span className="text-xs text-muted-foreground">
                {t.stats.vsLast}: <Delta value={4} unit="%" />
              </span>
            </div>
            <div ref={heatRef} role="img" aria-label={t.stats.heatmap.aria} className="overflow-x-auto">
              <div className="flex min-w-[560px] gap-[3px]">
                {Array.from({ length: WEEKS }, (_, w) => (
                  <div key={w} className="flex flex-1 flex-col gap-[3px]">
                    {/* Прості span-и, не motion: 371 елемент — CSS-перехід дешевший за 371 інстанс анімації */}
                    {Array.from({ length: 7 }, (_, d) => (
                      <span
                        key={d}
                        className={cn(
                          "block aspect-square w-full rounded-[3px] transition-[opacity,transform] duration-300 ease-out",
                          levelClass(ratioAt(w, d)),
                          w < weeks ? "scale-100 opacity-100" : "scale-50 opacity-0",
                        )}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
              <span>{t.stats.heatmap.less}</span>
              {["bg-accent/60", "bg-primary/25", "bg-primary/45", "bg-primary/70", "bg-primary"].map((c) => (
                <span key={c} className={cn("h-3 w-3 rounded-[3px]", c)} />
              ))}
              <span>{t.stats.heatmap.more}</span>
            </div>
          </Surface>
        </Reveal>

        {/* Віджети-інсайти */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Reveal delay={0} margin={STAGE_MARGIN} y={24}>
            <Widget Icon={CalendarDays} title={t.stats.weekdays.title}>
              <div className="flex h-20 items-end gap-1.5">
                {WEEKDAY_PCT.map((pct, i) => (
                  <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span
                      className={cn("w-full rounded-t-sm", pct === BEST ? "bg-positive" : pct === WORST ? "bg-destructive/80" : "bg-primary/60")}
                      style={{ height: `${pct}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{t.grid.days[i].slice(0, 2)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-positive">{t.stats.weekdays.best}</p>
              <p className="text-xs text-destructive">{t.stats.weekdays.worst}</p>
            </Widget>
          </Reveal>
          <Reveal delay={0.12} margin={STAGE_MARGIN} y={24}>
            <Widget Icon={ArrowUpRight} title={t.stats.movers.title}>
              <ul className="flex flex-col gap-1.5 text-sm">
                {MOVERS.map((mv) => (
                  <li key={mv.habit} className="flex items-center gap-2">
                    <Glyph habit={mv.habit} className="h-5 w-5 rounded-[5px]" />
                    <span className="truncate">{t.grid.habits[mv.habit]}</span>
                    <Delta value={mv.delta} unit="%" className="ml-auto" />
                  </li>
                ))}
              </ul>
            </Widget>
          </Reveal>
          <Reveal delay={0.24} margin={STAGE_MARGIN} y={24}>
            <Widget Icon={Waypoints} title={t.stats.synergy.title}>
              <div className="flex items-center gap-1.5 text-sm">
                <Glyph habit="gym" className="h-5 w-5 rounded-[5px]" /> → <Glyph habit="run" className="h-5 w-5 rounded-[5px]" />
                <span className="ml-1 font-display text-2xl font-extrabold tabular-nums">82%</span>
                <Delta value={28} unit="%" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t.stats.synergy.line}</p>
            </Widget>
          </Reveal>
          <Reveal delay={0.36} margin={STAGE_MARGIN} y={24}>
            <Widget Icon={HeartPulse} title={t.stats.moodCorr.title}>
              <div className="flex items-center gap-1" aria-hidden>
                {MOOD_ICONS.map((Icon, i) => (
                  <span
                    key={i}
                    className={cn("grid h-7 w-7 place-items-center rounded-full", i === 3 ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                ))}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t.stats.moodCorr.line}</p>
            </Widget>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

function Widget({ Icon, title, children }: { Icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <Surface className="flex h-full flex-col gap-3 px-4 py-3.5">
      <span className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" aria-hidden />
        {title}
      </span>
      <div className="min-w-0">{children}</div>
    </Surface>
  );
}

/** Дельта проти минулого періоду — як `DeltaBadge` у застосунку (зелена/червона зі стрілкою). */
function Delta({ value, unit = "", className }: { value: number; unit?: string; className?: string }) {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums", up ? "text-positive" : "text-destructive", className)}>
      <Icon className="h-3 w-3" aria-hidden />
      {up ? "+" : "−"}
      {Math.abs(value)}
      {unit}
    </span>
  );
}
