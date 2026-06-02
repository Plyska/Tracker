import { Switch } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { cn } from "@/shared/lib/cn";
import { toggleTheme } from "../model/themeSlice";

/**
 * Перемикач теми у вигляді тумблера (Radix Switch) з анімаціями:
 *  - кружечок їде зліва (light) → направо (dark) пружним spring'ом;
 *  - іконка всередині (Sun/Moon) показує поточну тему, змінюється з обертанням+фейдом;
 *  - легке «втискання» (whileTap) при кліку.
 * Усе вимикається за `prefers-reduced-motion`.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const theme = useAppSelector((s) => s.theme.value);
  const dispatch = useAppDispatch();
  const reduceMotion = useReducedMotion();
  const isDark = theme === "dark";
  const label = isDark ? t("theme.toLight") : t("theme.toDark");

  // Хід кружечка: 48px (внутрішня ширина) − 20px (кружечок) = 28px.
  const slide = reduceMotion
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 500, damping: 32 } as const);

  const iconVariants = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, rotate: -90, scale: 0.4 },
        animate: { opacity: 1, rotate: 0, scale: 1 },
        exit: { opacity: 0, rotate: 90, scale: 0.4 },
      };

  return (
    <Switch.Root
      asChild
      checked={isDark}
      onCheckedChange={() => dispatch(toggleTheme())}
      aria-label={label}
      title={label}
    >
      <motion.button
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        className={cn(
          "inline-flex h-7 w-13 shrink-0 cursor-pointer items-center rounded-full",
          "border-2 border-transparent outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "data-[state=unchecked]:bg-muted data-[state=checked]:bg-primary",
          className,
        )}
      >
        <Switch.Thumb asChild>
          <motion.span
            className="flex h-5 w-5 items-center justify-center rounded-full bg-card text-foreground shadow-card"
            initial={false}
            animate={{ x: isDark ? 28 : 0 }}
            transition={slide}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isDark ? "moon" : "sun"}
                className="inline-flex"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.18, ease: "easeInOut" }}
              >
                {isDark ? (
                  <Moon className="h-3 w-3" />
                ) : (
                  <Sun className="h-3 w-3" />
                )}
              </motion.span>
            </AnimatePresence>
          </motion.span>
        </Switch.Thumb>
      </motion.button>
    </Switch.Root>
  );
}
