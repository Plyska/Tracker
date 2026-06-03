import { Checkbox } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useAppDispatch } from "@/app/store/hooks";
import { toggleEntry } from "@/entities/habit-entry";
import { cn } from "@/shared/lib";

interface CheckboxCellProps {
  habitId: string;
  /** ISO 'YYYY-MM-DD' */
  date: string;
  done: boolean;
  /** hex-акцент навички — фон/рамка у відміченому стані */
  color: string;
  disabled?: boolean;
  label: string;
}

/**
 * Клітинка «навичка × день»: Radix Checkbox для a11y/клавіатури + Motion для
 * пружинної появи галочки. Відмічений стан фарбується кольором навички.
 * Майбутні дні приходять `disabled`.
 */
export function CheckboxCell({
  habitId,
  date,
  done,
  color,
  disabled,
  label,
}: CheckboxCellProps) {
  const dispatch = useAppDispatch();
  const reduceMotion = useReducedMotion();

  const pop = reduceMotion
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 600, damping: 26 } as const);

  return (
    <div className="flex items-center justify-center p-1.5">
      <Checkbox.Root
        asChild
        checked={done}
        disabled={disabled}
        onCheckedChange={(next) =>
          dispatch(toggleEntry({ habitId, date, done: next === true }))
        }
        aria-label={label}
        title={label}
      >
        <motion.button
          whileTap={reduceMotion || disabled ? undefined : { scale: 0.88 }}
          style={done ? { backgroundColor: color, borderColor: color } : undefined}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border outline-none",
            "transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            done ? "text-white" : "border-border",
            disabled
              ? "cursor-not-allowed opacity-35"
              : "cursor-pointer hover:bg-accent",
          )}
        >
          <AnimatePresence initial={false}>
            {done && (
              <motion.span
                className="inline-flex"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={pop}
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </Checkbox.Root>
    </div>
  );
}
