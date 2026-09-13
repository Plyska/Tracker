import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, m, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/shared/lib/cn";
import { useT } from "../lib/localeContext";
import { DiaryDemo, HabitTypesDemo, MoodDemo, PlannerDemo } from "../demo/tourDemos";
import { Section } from "../ui/Section";
import { Reveal } from "../ui/Reveal";

const ITEMS = ["types", "mood", "diary", "planner"] as const;
type Item = (typeof ITEMS)[number];

const DEMO: Record<Item, () => ReactNode> = {
  types: () => <HabitTypesDemo />,
  mood: () => <MoodDemo />,
  diary: () => <DiaryDemo />,
  planner: () => <PlannerDemo />,
};

/**
 * Тур по фічах: на десктопі зліва прилипає «сцена» з живим компонентом, справа прокручуються
 * чотири блоки тексту; той, що в центрі екрана, перемикає сцену. На мобільному кожен блок несе
 * свій компонент під текстом — без sticky і без дубльованого стану.
 */
export function FeatureTour() {
  const t = useT();
  const reduce = useReducedMotion();
  const [active, setActive] = useState<Item>("types");

  return (
    <Section id="features" eyebrow={t.features.eyebrow} title={t.features.h2}>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
        {/* Сцена (лише lg+) */}
        <div className="hidden lg:block">
          <div className="sticky top-28">
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={active}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {DEMO[active]()}
              </m.div>
            </AnimatePresence>
          </div>
        </div>

        <ol className="flex flex-col gap-16 lg:gap-[40vh] lg:py-[10vh]">
          {ITEMS.map((key, i) => (
            <TourBlock key={key} index={i} item={key} active={active === key} onActive={setActive} />
          ))}
        </ol>
      </div>
    </Section>
  );
}

function TourBlock({
  item,
  index,
  active,
  onActive,
}: {
  item: Item;
  index: number;
  active: boolean;
  onActive: (item: Item) => void;
}) {
  const t = useT();
  const ref = useRef<HTMLLIElement>(null);
  // Активний той блок, що перетинає горизонтальну смугу навколо центру екрана.
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (inView) onActive(item);
  }, [inView, item, onActive]);

  const copy = t.features.items[item];
  return (
    <li ref={ref} className="flex flex-col gap-6">
      <Reveal className={cn("max-w-md transition-opacity duration-300 lg:opacity-50", active && "lg:opacity-100")}>
        <span className="text-xs font-semibold text-muted-foreground tabular-nums">
          {String(index + 1).padStart(2, "0")} / {String(ITEMS.length).padStart(2, "0")}
        </span>
        <h3 className="mt-2 font-display text-2xl leading-tight font-bold tracking-[-0.02em]">{copy.title}</h3>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{copy.body}</p>
      </Reveal>
      <Reveal className="lg:hidden" delay={0.05}>
        {DEMO[item]()}
      </Reveal>
    </li>
  );
}
