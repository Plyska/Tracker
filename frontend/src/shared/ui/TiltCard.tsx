import {
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/shared/lib/cn";
import { useMediaQuery } from "@/shared/lib/hooks/useMediaQuery";
import { Card } from "./Card";

// Ефект — лише на десктопі з реальним ховером: на малих екранах і планшетах (touch) hover не має
// сенсу й «залипає» на тап, тож там рендеримо без нахилу/scale.
const HOVER_CAPABLE = "(min-width: 1024px) and (hover: hover) and (pointer: fine)";

const DEFAULT_MAX_TILT = 14; // градуси нахилу на краях (більший → сильніше «тягнеться» до курсора)
const SPRING = { stiffness: 300, damping: 22 } as const;

/**
 * 3D-нахил вмісту до курсора (perspective + rotateX/rotateY, пружне повернення, легкий підйом).
 * Без власної поверхні — обгортка для будь-чого (напр. картки-віджета, що вже рендерить `Card`).
 * Лише для миші (нема `onMouseMove` на тачі); під `useReducedMotion` рендерить вміст без обгорток.
 * Обгортки `h-full` — щоб не рвати ланцюг вирівнювання висоти в grid-рядах.
 */
export function Tilt({
  children,
  className,
  maxTilt = DEFAULT_MAX_TILT,
  hoverScale = 1.01,
  active = false,
}: {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  hoverScale?: number;
  active?: boolean;
}) {
  const reduce = useReducedMotion();
  const hoverCapable = useMediaQuery(HOVER_CAPABLE);
  const ref = useRef<HTMLDivElement>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState(false);
  // Нормалізована позиція курсора в межах елемента: -0.5..0.5.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [maxTilt, -maxTilt]), SPRING);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-maxTilt, maxTilt]), SPRING);

  // Поки `active` (дропдаун) відкрито, Radix ставить `pointer-events:none` на все поза меню, тож
  // картка не отримує mouse-подій і hover «залипає». Стежимо за курсором глобально (лише пишемо в
  // ref), а на закритті (cleanup ефекту) звіряємо реальну позицію з прямокутником картки й
  // пересинхронізуємо hover — надійніше за залиплий стан.
  useEffect(() => {
    if (!active || reduce || !hoverCapable) return;
    const el = ref.current; // нода картки стабільна до розмонтування — валідна й у cleanup
    const onWinMove = (e: PointerEvent) => {
      lastPointer.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", onWinMove);
    return () => {
      window.removeEventListener("pointermove", onWinMove);
      const p = lastPointer.current;
      let inside = false;
      if (el && p) {
        const r = el.getBoundingClientRect();
        inside = p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
      }
      setHovered(inside);
    };
  }, [active, reduce, hoverCapable]);

  if (reduce || !hoverCapable) return <>{children}</>;

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setHovered(true);
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };

  const onLeave = () => {
    setHovered(false);
    px.set(0);
    py.set(0);
  };

  return (
    <div
      className={cn("h-full", className)}
      style={{ perspective: 900 }}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <motion.div
        ref={ref}
        className="h-full"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        animate={{ scale: hovered || active ? hoverScale : 1 }}
        transition={SPRING}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Картка з 3D-нахилом (`Tilt` + `Card`). API — як у `Card` + опційні `maxTilt`/`hoverScale`/`active`. */
export function TiltCard({
  children,
  className,
  maxTilt,
  hoverScale,
  active,
  ...props
}: ComponentProps<typeof Card> & {
  maxTilt?: number;
  hoverScale?: number;
  active?: boolean;
}) {
  return (
    <Tilt maxTilt={maxTilt} hoverScale={hoverScale} active={active}>
      <Card className={className} {...props}>
        {children}
      </Card>
    </Tilt>
  );
}
