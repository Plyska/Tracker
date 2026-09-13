import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { useHydrated } from "../lib/useHydrated";

/**
 * Число, що «дораховується» до значення, коли потрапляє у viewport.
 * SSR/no-JS/reduced-motion — одразу фінальне значення. Після гідрації елемент нижче екрана
 * скидається в 0 (з rAF, не синхронно) і рахує при появі.
 */
export function CountUp({
  to,
  format = (v) => String(Math.round(v)),
  duration = 1.1,
}: {
  to: number;
  format?: (v: number) => string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const [value, setValue] = useState(to);
  const armed = useRef(false);

  useEffect(() => {
    if (!hydrated || reduce || inView) return;
    const el = ref.current;
    if (!el || el.getBoundingClientRect().top <= window.innerHeight) return;
    const id = requestAnimationFrame(() => {
      armed.current = true;
      setValue(0);
    });
    return () => cancelAnimationFrame(id);
  }, [hydrated, reduce, inView]);

  useEffect(() => {
    if (!inView || !armed.current) return;
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [inView, to, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {format(value)}
    </span>
  );
}
