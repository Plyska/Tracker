import { useEffect, useRef, useState, type ReactNode } from "react";
import { m, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

/**
 * М'яка поява блоку при скролі — без «паркування» контенту на opacity:0.
 *
 * У пререндереному HTML і до гідрації все видиме (SEO, no-JS, перший кадр). Після монтування
 * ховаємо ЛИШЕ те, що зараз нижче екрана, і показуємо, коли воно доїде у viewport. Під
 * `prefers-reduced-motion` анімації немає взагалі.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  margin = "0px 0px -12% 0px",
  y = 18,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li" | "article";
  /** rootMargin для useInView: більший від'ємний низ → елемент чекає, доки не доскролять глибше. */
  margin?: string;
  /** Зсув появи знизу, px. */
  y?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // `armed` — блок був нижче першого екрана на момент монтування, тож його можна сховати до появи.
  // Те, що вже видно, не чіпаємо. Стан ставиться з rAF-колбеку (не синхронно в ефекті).
  const [armed, setArmed] = useState(false);
  // Тип margin у framer — шаблонний літерал; рядок із пропа приводимо явно.
  const inView = useInView(ref, { once: true, margin: margin as `${number}px ${number}px ${number}% ${number}px` });

  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el || el.getBoundingClientRect().top <= window.innerHeight) return;
    const id = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(id);
  }, [reduce]);

  const hidden = armed && !inView;

  // Union індексу `m[as]` не має спільної сигнатури виклику — усі три елементи однаково блокові,
  // тож приводимо до типу m.div.
  const Tag = (as === "li" ? m.li : as === "article" ? m.article : m.div) as typeof m.div;
  return (
    <Tag
      ref={ref}
      className={cn(className)}
      initial={false}
      animate={hidden ? { opacity: 0, y } : { opacity: 1, y: 0 }}
      transition={armed && inView ? { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay } : { duration: 0 }}
    >
      {children}
    </Tag>
  );
}
