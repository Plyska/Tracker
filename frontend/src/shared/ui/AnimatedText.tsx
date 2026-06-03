import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

type AnimatedTextProps = {
  /** Текст; зміна значення запускає анімацію (використовується як `key`). */
  children: string;
  className?: string;
};

/**
 * Інлайн-текст, що плавно змінюється при зміні значення (напр. при зміні мови):
 * старий виїжджає вгору й зникає, новий заїжджає знизу — той самий ефект, що й
 * заголовок сторінки в Header. Поважає `prefers-reduced-motion`.
 *
 * Рендериться як `inline-block span`, тож кладеться всередину семантичних тегів
 * (h3/p/label). Для обрізання довгих рядків додай `truncate max-w-full` у className.
 */
export function AnimatedText({ children, className }: AnimatedTextProps) {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={children}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn("inline-block", className)}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}
