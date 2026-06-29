import { useEffect, useRef, useState, type WheelEvent } from "react";
import { Popover } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib";

interface TimePickerProps {
  /** 'HH:mm' або '' (не задано). */
  value: string;
  onChange: (value: string) => void;
  className?: string;
  "aria-invalid"?: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5)); // крок 5 хв

/**
 * Пікер часу 'HH:mm' у поповері: дві прокручувані колонки (години / хвилини).
 * Прокрутка — вручну через `onWheel`, бо scroll-lock модалки (Radix Dialog) блокує нативний скрол
 * у портальованому поповері.
 */
export function TimePicker({
  value,
  onChange,
  className,
  "aria-invalid": ariaInvalid,
}: TimePickerProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [hh, mm] = value ? value.split(":") : ["", ""];

  const hourRef = useRef<HTMLButtonElement>(null);
  const minRef = useRef<HTMLButtonElement>(null);

  // При відкритті — прокрутити обрані год/хв у видиму зону.
  useEffect(() => {
    if (!open) return;
    hourRef.current?.scrollIntoView({ block: "center" });
    minRef.current?.scrollIntoView({ block: "center" });
  }, [open]);

  const pickHour = (h: string) => onChange(`${h}:${mm || "00"}`);
  const pickMinute = (m: string) => {
    onChange(`${hh || "00"}:${m}`);
    setOpen(false);
  };

  // Ручний скрол колонки (нативний заблоковано scroll-lock'ом Dialog).
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.currentTarget.scrollTop += e.deltaY;
  };

  const item = (selected: boolean) =>
    cn(
      "shrink-0 rounded-md px-3 py-1.5 text-sm tabular-nums outline-none transition-colors",
      "focus-visible:ring-2 focus-visible:ring-ring",
      selected
        ? "bg-primary font-semibold text-primary-foreground"
        : "hover:bg-accent",
    );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-invalid={ariaInvalid}
          className={cn(
            "flex h-9 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm outline-none",
            "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive",
            className,
          )}
        >
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={cn("tabular-nums", !value && "text-muted-foreground")}>
            {value || t("timePicker.placeholder")}
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Portal forceMount>
        <AnimatePresence>
          {open && (
            <Popover.Content asChild forceMount align="start" sideOffset={6}>
              <motion.div
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                style={{
                  transformOrigin: "var(--radix-popover-content-transform-origin)",
                }}
                className="z-50 w-44 rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-card"
              >
                <div className="flex gap-1">
                  <div
                    onWheel={onWheel}
                    className="no-scrollbar flex max-h-48 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain"
                  >
                    {HOURS.map((h) => (
                      <button
                        key={h}
                        ref={h === hh ? hourRef : undefined}
                        type="button"
                        onClick={() => pickHour(h)}
                        className={item(h === hh)}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                  <div
                    onWheel={onWheel}
                    className="no-scrollbar flex max-h-48 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain"
                  >
                    {MINUTES.map((m) => (
                      <button
                        key={m}
                        ref={m === mm ? minRef : undefined}
                        type="button"
                        onClick={() => pickMinute(m)}
                        className={item(m === mm)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                {value && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className="mt-1 w-full rounded-md px-3 py-1.5 text-xs text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t("timePicker.clear")}
                  </button>
                )}
              </motion.div>
            </Popover.Content>
          )}
        </AnimatePresence>
      </Popover.Portal>
    </Popover.Root>
  );
}
