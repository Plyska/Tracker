import { Toast as RToast } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { dismissToast, useToasts } from "./toastStore";

/**
 * Toast-сповіщення на Radix Toast + Motion. Стан — у зовнішньому сторі (`toastStore`).
 * Анімація появи/зникнення — як у решти попапів (fade + slide), під `useReducedMotion`.
 */

const TOAST_DURATION = 4000;
const ICONS = { error: XCircle, success: CheckCircle2 } as const;

export function Toaster() {
  const toasts = useToasts();
  const reduceMotion = useReducedMotion();

  return (
    <RToast.Provider swipeDirection="right" duration={TOAST_DURATION}>
      <AnimatePresence>
        {toasts.map(({ id, message, variant }) => {
          const Icon = ICONS[variant];
          return (
            <RToast.Root
              key={id}
              asChild
              forceMount
              duration={TOAST_DURATION}
              onOpenChange={(open) => {
                if (!open) dismissToast(id);
              }}
            >
              <motion.li
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, x: 24, scale: 0.96 }
                }
                animate={
                  reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }
                }
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, x: 24, scale: 0.96 }
                }
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex items-start gap-3.5 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-card"
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-6 w-6 shrink-0",
                    variant === "error" ? "text-destructive" : "text-primary",
                  )}
                />
                <RToast.Description className="flex-1 text-base leading-snug">
                  {message}
                </RToast.Description>
                <RToast.Close
                  aria-label="Close"
                  className="shrink-0 rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-5 w-5" />
                </RToast.Close>
              </motion.li>
            </RToast.Root>
          );
        })}
      </AnimatePresence>
      <RToast.Viewport className="fixed bottom-0 right-0 z-100 m-4 flex w-105 max-w-[calc(100vw-2rem)] list-none flex-col gap-2.5 outline-none" />
    </RToast.Provider>
  );
}
