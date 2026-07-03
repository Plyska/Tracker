import { type ComponentProps, type MouseEvent, useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { Card } from "./Card";

const MAX_TILT = 7; // градуси нахилу на краях
const SPRING = { stiffness: 300, damping: 22 } as const;

/**
 * Картка з легким 3D-нахилом до курсора (perspective + rotateX/rotateY, пружне повернення).
 * Лише для миші (нема `onMouseMove` на тачі) і повністю вимикається під `useReducedMotion`
 * (тоді — звичайна `Card`). API — як у `Card` (className/children/...props).
 */
export function TiltCard({
  children,
  className,
  ...props
}: ComponentProps<typeof Card>) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // Нормалізована позиція курсора в межах картки: -0.5..0.5.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]), SPRING);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]), SPRING);

  if (reduce) {
    return (
      <Card className={className} {...props}>
        {children}
      </Card>
    );
  }

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };

  const reset = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div style={{ perspective: 900 }} onMouseMove={onMove} onMouseLeave={reset}>
      <motion.div
        ref={ref}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{ scale: 1.01 }}
        transition={SPRING}
      >
        <Card className={className} {...props}>
          {children}
        </Card>
      </motion.div>
    </div>
  );
}
