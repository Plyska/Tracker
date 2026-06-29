import { useState } from "react";
import { Popover } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  addDays,
  addMonths,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  startOfWeek,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/shared/ui";
import {
  cn,
  fromISODate,
  getDateFnsLocale,
  getMonthDays,
  toISODate,
} from "@/shared/lib";

interface DatePickerProps {
  /** Обрана дата — ISO 'YYYY-MM-DD' або '' (не задано). */
  value: string;
  onChange: (date: string) => void;
  className?: string;
  /** Дозволити «без дати» (кнопка очищення в календарі). */
  clearable?: boolean;
  /** Текст тригера, коли дата не задана. */
  placeholder?: string;
}

/** Понеділок-зміщення для дня (date-fns: Нд=0…Сб=6 → Пн=0…Нд=6). */
const mondayIndex = (date: Date): number => (getDay(date) + 6) % 7;

/** Календар-пікер дати у поповері (Пн-перший тиждень, локалізований). */
export function DatePicker({
  value,
  onChange,
  className,
  clearable,
  placeholder,
}: DatePickerProps) {
  const { t, i18n } = useTranslation();
  const locale = getDateFnsLocale(i18n.language);
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [view, setView] = useState(() => (value ? fromISODate(value) : today));

  const selected = value ? fromISODate(value) : null;
  const days = getMonthDays(view);
  const leadingBlanks = mondayIndex(days[0]);

  // Локалізовані короткі назви днів тижня (Пн→Нд).
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    format(addDays(weekStart, i), "EEEEEE", { locale }),
  );

  const pick = (day: Date) => {
    onChange(toISODate(day));
    setOpen(false);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setView(value ? fromISODate(value) : today); // повертаємось до обраного місяця
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm outline-none",
            "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span
            className={cn(
              "font-medium tabular-nums",
              !selected && "font-normal text-muted-foreground",
            )}
          >
            {selected
              ? format(selected, "d MMM yyyy", { locale })
              : (placeholder ?? t("datePicker.noDay"))}
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
                className="z-50 w-72 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-card"
              >
                {/* Заголовок: ‹ Місяць рік › */}
                <div className="mb-2 flex items-center justify-between">
                  <IconButton
                    size="sm"
                    aria-label={t("datePicker.prevMonth")}
                    onClick={() => setView(addMonths(view, -1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </IconButton>
                  <span className="text-sm font-semibold capitalize tabular-nums">
                    {format(view, "LLLL yyyy", { locale })}
                  </span>
                  <IconButton
                    size="sm"
                    aria-label={t("datePicker.nextMonth")}
                    onClick={() => setView(addMonths(view, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </IconButton>
                </div>

                {/* Назви днів тижня */}
                <div className="mb-1 grid grid-cols-7 gap-1">
                  {weekdayLabels.map((label, i) => (
                    <span
                      key={i}
                      className="flex h-7 items-center justify-center text-xs font-medium capitalize text-muted-foreground"
                    >
                      {label}
                    </span>
                  ))}
                </div>

                {/* Сітка днів */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: leadingBlanks }).map((_, i) => (
                    <span key={`blank-${i}`} />
                  ))}
                  {days.map((day) => {
                    const isSelected = selected ? isSameDay(day, selected) : false;
                    const isToday = isSameDay(day, today);
                    const outside = !isSameMonth(day, view);
                    return (
                      <button
                        key={toISODate(day)}
                        type="button"
                        onClick={() => pick(day)}
                        aria-label={format(day, "PPP", { locale })}
                        aria-current={isToday ? "date" : undefined}
                        className={cn(
                          "flex h-9 items-center justify-center rounded-md text-sm tabular-nums outline-none transition-colors",
                          "focus-visible:ring-2 focus-visible:ring-ring",
                          isSelected
                            ? "bg-primary font-semibold text-primary-foreground"
                            : cn(
                                "hover:bg-accent",
                                isToday && "font-semibold text-primary",
                                outside && "text-muted-foreground",
                              ),
                        )}
                      >
                        {format(day, "d")}
                      </button>
                    );
                  })}
                </div>

                {clearable && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className="mt-2 w-full rounded-md px-3 py-1.5 text-xs text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t("datePicker.noDay")}
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
