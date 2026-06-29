import { useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HabitGlyph, useGetHabitsQuery } from "@/entities/habit";
import { cn } from "@/shared/lib";

interface TaskTitleFieldProps {
  title: string;
  habitId: string;
  /** Викликається з новою назвою та (опційно) id навички, якщо обрано зі списку. */
  onChange: (title: string, habitId: string) => void;
  invalid?: boolean;
  describedBy?: string;
}

/**
 * Об'єднане поле назви+навички: користувач вводить текст і отримує підказки зі своїх навичок.
 * Список відкривається при збігах за текстом або вручну (стрілка). Вибір підказки підставляє назву
 * й лінкує навичку; ручне введення → вільна назва без навички.
 */
export function TaskTitleField({
  title,
  habitId,
  onChange,
  invalid,
  describedBy,
}: TaskTitleFieldProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const { data: habits = [] } = useGetHabitsQuery();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  // manual: список відкрито стрілкою (показуємо всі); інакше — лише при збігах за текстом.
  const [manual, setManual] = useState(false);
  const [active, setActive] = useState(-1);

  const linked = habitId ? habits.find((h) => h.id === habitId) : undefined;
  const q = title.trim().toLowerCase();
  const filtered = habits.filter((h) => h.name.toLowerCase().includes(q));
  const suggestions = manual ? filtered : q ? filtered : [];
  const showList = open && suggestions.length > 0;

  const close = () => {
    setOpen(false);
    setManual(false);
    setActive(-1);
  };

  const select = (id: string, name: string) => {
    onChange(name, id);
    close();
  };

  const toggleManual = () => {
    if (open) close();
    else {
      setManual(true);
      setOpen(true);
      setActive(-1);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      const h = suggestions[active];
      select(h.id, h.name);
    } else if (e.key === "Escape") {
      close();
    }
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "flex h-9 items-center gap-2 rounded-md border border-input bg-transparent pl-2 pr-1",
          "focus-within:ring-2 focus-within:ring-ring",
          invalid && "border-destructive",
        )}
      >
        {linked && (
          <HabitGlyph
            name={linked.name}
            color={linked.color}
            icon={linked.icon}
            className="h-5 w-5"
            iconClassName="h-3 w-3"
          />
        )}
        <input
          ref={inputRef}
          autoFocus
          value={title}
          placeholder={t("tasks.form.titlePlaceholder")}
          role="combobox"
          aria-expanded={showList}
          aria-autocomplete="list"
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          onChange={(e) => {
            setManual(false);
            setOpen(true);
            setActive(-1);
            onChange(e.target.value, "");
          }}
          onBlur={() => setTimeout(close, 120)}
          onKeyDown={onKeyDown}
        />
        {habits.length > 0 && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={t("tasks.form.showHabits")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleManual}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
            />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showList && (
          <motion.ul
            role="listbox"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-card"
            // утримуємо фокус інпута під час кліку по опції
            onMouseDown={(e) => e.preventDefault()}
          >
            {suggestions.map((habit, i) => (
              <li key={habit.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => select(habit.id, habit.name)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none",
                    i === active && "bg-accent text-accent-foreground",
                  )}
                >
                  <HabitGlyph
                    name={habit.name}
                    color={habit.color}
                    icon={habit.icon}
                    className="h-5 w-5"
                    iconClassName="h-3 w-3"
                  />
                  <span className="truncate">{habit.name}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
