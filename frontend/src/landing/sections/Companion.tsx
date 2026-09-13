import { useRef } from "react";
import { m, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { BookLock, Check, ShieldCheck, Sparkles, Trash2, TrendingDown, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useT } from "../lib/localeContext";
import { useHydrated } from "../lib/useHydrated";
import { Section } from "../ui/Section";
import { Reveal } from "../ui/Reveal";
import { Glyph, Pill, Surface, type HabitKey } from "../ui/primitives";
import { MOOD_ICONS } from "../ui/habitTokens";

/**
 * Секція помічника. Лист тижня «пишеться» за прогресом скролу: кожен рядок проявляється у своєму
 * вікні. До гідрації (і під reduced-motion) лист повністю видимий — контент не паркується.
 */
export function Companion() {
  const t = useT();
  const reduce = useReducedMotion();
  const letterRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: letterRef, offset: ["start 92%", "end 55%"] });
  // Копія прогресу в звичайний motion value: style, прив'язаний до useScroll напряму, framer гонить
  // через WAAPI ScrollTimeline і губить вікна появи (див. Stats). Тут — той самий обхід.
  const progress = useMotionValue(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => progress.set(v));
  // Скрол-проявлення озброюємо лише на клієнті: пререндерений лист має бути повністю видимим.
  const armed = useHydrated() && !reduce;

  const L = t.companion.letter;
  // Рядки листа в порядку появи; заголовки рубрик проявляються разом із першим рядком рубрики.
  // `habits` — іконки навичок, про які йдеться в рядку (як HabitGlyph у застосунку); `mood` — обличчя.
  const lines: { kind: "head" | "line" | "q"; text: string; habits?: HabitKey[]; mood?: number }[] = [
    { kind: "head", text: L.highlights },
    { kind: "line", text: L.lines.h1, habits: ["read"] },
    { kind: "line", text: L.lines.h2, habits: ["run"] },
    { kind: "head", text: L.slips },
    { kind: "line", text: L.lines.s1, habits: ["med", "run"] },
    { kind: "line", text: L.lines.s2, mood: 2 },
    { kind: "head", text: L.question },
    { kind: "q", text: L.lines.q },
  ];

  const rules: { Icon: LucideIcon; t: string; d: string }[] = [
    { Icon: ShieldCheck, ...t.companion.rules.write },
    { Icon: BookLock, ...t.companion.rules.diary },
    { Icon: Trash2, ...t.companion.rules.off },
  ];

  return (
    <Section id="companion" eyebrow={t.companion.eyebrow} title={t.companion.h2} lead={t.companion.p}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
        {/* Лист */}
        <Reveal>
          <Surface ref={letterRef} className="relative overflow-hidden p-6 sm:p-8">
            <div aria-hidden className="glow-hero pointer-events-none absolute inset-0 opacity-70" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <span className="font-display text-lg font-bold tracking-tight">{L.title}</span>
                <Pill className="ml-auto bg-accent text-accent-foreground">{t.companion.beta}</Pill>
              </div>
              <div className="mt-6 flex flex-col gap-2.5">
                {lines.map((line, i) => (
                  <LetterLine key={i} index={i} count={lines.length} progress={progress} armed={armed} {...line} />
                ))}
              </div>
            </div>
          </Surface>
        </Reveal>

        {/* Правила + дві менші картки */}
        <div className="flex flex-col gap-6">
          <Reveal delay={0.05}>
            <h3 className="font-display text-xl font-bold tracking-tight">{t.companion.rules.title}</h3>
            <ul className="mt-4 flex flex-col divide-y divide-border">
              {rules.map(({ Icon, t: title, d }) => (
                <li key={title} className="flex gap-3.5 py-4">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-[15px] font-semibold">{title}</span>
                    <span className="text-sm leading-relaxed text-muted-foreground">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {/* Підказка-патерн з дашборда */}
            <Surface className="flex gap-3 px-4 py-3.5">
              <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <div className="flex flex-col gap-1 text-sm">
                <span>{t.companion.insight.text}</span>
                <span className="text-[13px] font-medium text-accent-foreground">{t.companion.insight.action}</span>
              </div>
            </Surface>
            {/* Картка підтвердження чек-іну */}
            <Surface className="flex flex-col gap-3 px-4 py-3.5">
              <span className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                {t.companion.confirm.title}
              </span>
              <ul className="flex flex-col gap-1.5 text-sm">
                {t.companion.confirm.items.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={3} aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <span className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
                  {t.companion.confirm.save}
                </span>
                <span className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium">
                  {t.companion.confirm.cancel}
                </span>
              </div>
            </Surface>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

function LetterLine({
  index,
  count,
  progress,
  armed,
  kind,
  text,
  habits,
  mood,
}: {
  index: number;
  count: number;
  progress: MotionValue<number>;
  armed: boolean;
  kind: "head" | "line" | "q";
  text: string;
  habits?: HabitKey[];
  mood?: number;
}) {
  const start = index / count;
  const opacity = useTransform(progress, [start, start + 0.7 / count], [0.12, 1]);
  const y = useTransform(progress, [start, start + 0.7 / count], [6, 0]);

  const Tag = kind === "head" ? m.h4 : m.p;
  const MoodIcon = mood ? MOOD_ICONS[mood - 1] : null;
  return (
    <Tag
      style={armed ? { opacity, y } : undefined}
      className={cn(
        kind === "head" && "pt-2 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase first:pt-0",
        kind === "line" && "flex items-start gap-2.5 text-[15px] leading-relaxed",
        kind === "q" && "rounded-lg bg-accent px-3.5 py-2.5 text-[15px] leading-relaxed text-foreground",
      )}
    >
      {(habits || MoodIcon) && (
        <span className="mt-0.5 flex shrink-0 items-center gap-1" aria-hidden>
          {habits?.map((h) => <Glyph key={h} habit={h} className="h-5 w-5 rounded-[5px]" />)}
          {MoodIcon && (
            <span className="grid h-5 w-5 place-items-center rounded-[5px] bg-accent text-accent-foreground">
              <MoodIcon className="h-3.5 w-3.5" />
            </span>
          )}
        </span>
      )}
      <span>{text}</span>
    </Tag>
  );
}
