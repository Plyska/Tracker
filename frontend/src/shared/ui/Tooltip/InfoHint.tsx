import { useState } from "react";
import { Tooltip } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Info } from "lucide-react";
import { cn } from "@/shared/lib";

interface InfoHintProps {
  /** Пояснювальний текст (він же — aria-label тригера для скрінрідерів). */
  label: string;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * Маленька іконка-«i» з тултіпом-поясненням. Hover/focus відкривають через Radix; додатковий
 * onClick-тогл — щоб працювало й на дотику (там hover немає). Поява — як у дропдаунів проєкту
 * (fade + scale-pop від тригера, під reduce-motion лишається лише fade).
 */
export function InfoHint({ label, className, side = "top" }: InfoHintProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root open={open} onOpenChange={setOpen}>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            aria-label={label}
            onClick={(e) => {
              e.preventDefault();
              setOpen((v) => !v);
            }}
            className={cn(
              "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              className,
            )}
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal forceMount>
          <AnimatePresence>
            {open && (
              <Tooltip.Content
                asChild
                forceMount
                side={side}
                sideOffset={6}
                collisionPadding={12}
              >
                <motion.div
                  role="tooltip"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  style={{
                    transformOrigin:
                      "var(--radix-tooltip-content-transform-origin)",
                  }}
                  className="z-50 max-w-64 rounded-md border border-border bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-card"
                >
                  {label}
                </motion.div>
              </Tooltip.Content>
            )}
          </AnimatePresence>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
