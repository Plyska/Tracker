import type { ComponentProps, ReactNode } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { buttonBase, buttonSizes, buttonVariants, type ButtonSize, type ButtonVariant } from "@/shared/ui/Button/variants";
import { HABIT_STYLE, MOOD_ICONS, type HabitKey } from "./habitTokens";

export type { HabitKey } from "./habitTokens";

/* ---------- Навички демо ---------- */

/** Іконка навички на кольоровій плашці — як `HabitGlyph` у застосунку. */
export function Glyph({ habit, className }: { habit: HabitKey; className?: string }) {
  const { bg, Icon } = HABIT_STYLE[habit];
  return (
    <span
      aria-hidden
      className={cn("inline-grid h-6 w-6 shrink-0 place-items-center rounded-md text-white", bg, className)}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
    </span>
  );
}

/* ---------- Клітинка сітки ---------- */

export type CellState =
  | { kind: "empty" }
  | { kind: "done" }
  | { kind: "time"; label: string }
  | { kind: "plus" }; // часова навичка без хвилин — «+» як у застосунку

const POP = { type: "spring", stiffness: 600, damping: 26 } as const;

/**
 * Клітинка «навичка × день». Відмічений стан фарбується кольором навички, галочка з'являється
 * пружиною (той самий spring, що в CheckboxCell застосунку). `initial={false}` на AnimatePresence —
 * при гідрації/SSR нічого не стрибає.
 * `animated={false}` — для сіток, стан яких не змінюється (проблема, тур, персоналізація): без
 * motion-обгорток, бо сотня інстансів анімації заради статичної картинки — зайва робота при гідрації.
 */
export function Cell({
  habit,
  state,
  future,
  today,
  size = "md",
  animated = true,
  className,
}: {
  habit: HabitKey;
  state: CellState;
  future?: boolean;
  today?: boolean;
  size?: "sm" | "md";
  animated?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const s = HABIT_STYLE[habit];
  const filled = state.kind === "done" || state.kind === "time";
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-grid place-items-center rounded-md border text-white",
        size === "md" ? "h-7 w-7 sm:h-8 sm:w-8" : "h-5 w-5 rounded-[5px]",
        filled ? cn(s.bg, s.border) : "border-border",
        future && "opacity-35",
        today && !filled && "border-primary/40",
        className,
      )}
    >
      {state.kind === "plus" && <span className="text-xs font-semibold text-muted-foreground">+</span>}
      {!animated && state.kind === "done" && (
        <Check className={size === "md" ? "h-4 w-4" : "h-3 w-3"} strokeWidth={3} />
      )}
      {!animated && state.kind === "time" && (
        <span className="text-[10px] leading-none font-bold tabular-nums">{state.label}</span>
      )}
      {animated && (
      <AnimatePresence initial={false}>
        {state.kind === "done" && (
          <m.span
            key="check"
            className="inline-flex"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : POP}
          >
            <Check className={size === "md" ? "h-4 w-4" : "h-3 w-3"} strokeWidth={3} />
          </m.span>
        )}
        {state.kind === "time" && (
          <m.span
            key="time"
            className="text-[10px] leading-none font-bold tabular-nums"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : POP}
          >
            {state.label}
          </m.span>
        )}
      </AnimatePresence>
      )}
    </span>
  );
}

/* ---------- Настрій ---------- */

/** Ряд із 5 облич 1–5 — як `MoodPicker` у застосунку. Керований, презентаційний. */
export function MoodFaces({
  value,
  onChange,
  labels,
  size = "md",
  className,
}: {
  value?: number;
  onChange?: (v: number) => void;
  labels: readonly string[];
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div role="group" className={cn("flex items-center gap-0.5", className)}>
      {MOOD_ICONS.map((Icon, i) => {
        const v = i + 1;
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={active}
            aria-label={labels[i]}
            title={labels[i]}
            onClick={onChange ? () => onChange(v) : undefined}
            tabIndex={onChange ? 0 : -1}
            className={cn(
              "grid shrink-0 place-items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              size === "md" ? "h-9 w-9" : "h-8 w-8",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
              !onChange && "cursor-default",
            )}
          >
            {/* Активне обличчя «підстрибує» пружиною при виборі (initial=false — без стрибка на SSR) */}
            <m.span
              className="inline-flex"
              initial={false}
              animate={{ scale: active ? [0.6, 1] : 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
            >
              <Icon className={size === "md" ? "h-5 w-5" : "h-4 w-4"} />
            </m.span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Поверхні й кнопки-посилання ---------- */

/** Піднята поверхня на токенах — той самий рецепт, що `Card` у shared/ui, без зайвого паддінгу. */
export function Surface({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-card text-card-foreground shadow-card", className)}
      {...props}
    />
  );
}

/** Посилання у вигляді кнопки — спільні `buttonVariants` із застосунком + легкий hover/tap. */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof m.a>, "children"> & {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <m.a
      href={href}
      whileHover={reduce ? undefined : { y: -1 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], "no-underline", className)}
      {...props}
    >
      {children}
    </m.a>
  );
}

/** Маленький бейдж (лічильник «1/3», «0.3/5 год», тип навички). */
export function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] leading-4 font-medium text-muted-foreground tabular-nums",
        className,
      )}
    >
      {children}
    </span>
  );
}
