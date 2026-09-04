import { useState } from "react";
import { Popover } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToggleEntryMutation } from "@/entities/habit-entry";
import { cn, formatCellDuration } from "@/shared/lib";

interface TimeCellProps {
  habitId: string;
  /** ISO 'YYYY-MM-DD' */
  date: string;
  /** Хвилини за день (0/none = не залоговано). */
  minutes: number;
  /** hex-акцент навички — фон/рамка у стані з часом. */
  color: string;
  disabled?: boolean;
  label: string;
}

const STEP = 15; // крок степера, хв
const PRESETS = [15, 30, 60] as const; // швидкі чипи «додати N хв»
const MAX = 1440; // 24 год/день
const clamp = (m: number) => Math.max(0, Math.min(MAX, m));

/**
 * Клітинка ЧАСОВОЇ навички (ADR 0011): замість галочки показує тривалість. Тап → Radix Popover
 * зі степером (−/+15) і пресетами (+15/+30/+60). Редагується локальний драфт; коміт (один PUT) — на
 * закритті поповера (`done` = minutes>0 виводить сервер). Майбутні/поза-тижнем дні приходять `disabled`.
 */
export function TimeCell({
  habitId,
  date,
  minutes,
  color,
  disabled,
  label,
}: TimeCellProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [toggleEntry] = useToggleEntryMutation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(minutes);

  const filled = minutes > 0;

  const commit = () => {
    const next = clamp(draft);
    if (next === minutes) return;
    void toggleEntry({ habitId, date, done: next > 0, minutes: next });
  };

  const onOpenChange = (next: boolean) => {
    if (next) {
      setDraft(minutes); // синхронізуємо драфт із поточним при відкритті
    } else {
      commit();
    }
    setOpen(next);
  };

  const chipClass =
    "flex-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="flex items-center justify-center p-1 sm:p-1.5">
      <Popover.Root open={open} onOpenChange={disabled ? undefined : onOpenChange}>
        <Popover.Trigger asChild>
          <motion.button
            type="button"
            disabled={disabled}
            aria-label={label}
            title={label}
            whileTap={reduceMotion || disabled ? undefined : { scale: 0.9 }}
            style={filled ? { backgroundColor: color, borderColor: color } : undefined}
            className={cn(
              "flex h-8 min-w-8 items-center justify-center rounded-md border px-1 text-[10px] font-semibold leading-none tabular-nums outline-none",
              "transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              filled ? "text-white" : "border-border text-muted-foreground",
              disabled
                ? "cursor-not-allowed opacity-35"
                : "cursor-pointer hover:bg-accent",
            )}
          >
            {filled ? (
              formatCellDuration(minutes)
            ) : (
              <Plus className={cn("h-3.5 w-3.5", disabled && "opacity-0")} />
            )}
          </motion.button>
        </Popover.Trigger>

        <Popover.Portal forceMount>
          <AnimatePresence>
            {open && (
              <Popover.Content asChild forceMount align="center" sideOffset={6}>
                <motion.div
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  style={{
                    transformOrigin: "var(--radix-popover-content-transform-origin)",
                  }}
                  className="z-50 w-52 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-card"
                >
                  {/* Степер поточного значення */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      aria-label={t("timeCell.decrease")}
                      onClick={() => setDraft((d) => clamp(d - STEP))}
                      disabled={draft <= 0}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-border outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-16 text-center text-lg font-semibold tabular-nums">
                      {draft > 0 ? formatCellDuration(draft) : t("timeCell.none")}
                    </span>
                    <button
                      type="button"
                      aria-label={t("timeCell.increase")}
                      onClick={() => setDraft((d) => clamp(d + STEP))}
                      disabled={draft >= MAX}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-border outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Швидкі пресети «+N хв» */}
                  <div className="mt-2 flex gap-1.5">
                    {PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setDraft((d) => clamp(d + p))}
                        className={chipClass}
                      >
                        +{p}
                      </button>
                    ))}
                  </div>

                  {/* Дії: очистити (0) + готово (коміт на закритті) */}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setDraft(0)}
                      disabled={draft === 0}
                      className="rounded-md px-2 py-1.5 text-xs text-muted-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                    >
                      {t("timeCell.clear")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {t("timeCell.done")}
                    </button>
                  </div>
                </motion.div>
              </Popover.Content>
            )}
          </AnimatePresence>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
