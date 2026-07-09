import { useRef, useState, type KeyboardEvent } from "react";
import { Popover } from "radix-ui";
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
  /** Enter без активної підказки → підтвердити (напр. створити задачу в редакторі). */
  onSubmit?: () => void;
  /** Backspace на порожньому полі → напр. прибрати рядок у композері. */
  onBackspaceEmpty?: () => void;
  invalid?: boolean;
  describedBy?: string;
  autoFocus?: boolean;
  placeholder?: string;
  /** Без рамки/фону — вбудовується як рядок редактора (не форма). */
  bare?: boolean;
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
  onSubmit,
  onBackspaceEmpty,
  invalid,
  describedBy,
  autoFocus = true,
  placeholder,
  bare,
}: TaskTitleFieldProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const { data: habits = [] } = useGetHabitsQuery();
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
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
    if (e.key === "Enter") {
      if (showList && active >= 0) {
        e.preventDefault();
        const h = suggestions[active];
        select(h.id, h.name);
      } else if (onSubmit) {
        e.preventDefault();
        onSubmit();
      }
      return;
    }
    if (
      e.key === "Backspace" &&
      title === "" &&
      e.currentTarget.selectionStart === 0 &&
      onBackspaceEmpty
    ) {
      e.preventDefault();
      onBackspaceEmpty();
      return;
    }
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Escape") {
      close();
    }
  };

  return (
    <Popover.Root
      open={showList}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <Popover.Anchor asChild>
        <div
          ref={anchorRef}
          className={cn(
            bare
              ? "flex items-center gap-2"
              : cn(
                  "flex h-9 items-center gap-2 rounded-md border border-input bg-transparent pl-2 pr-1",
                  "focus-within:ring-2 focus-within:ring-ring",
                  invalid && "border-destructive",
                ),
          )}
        >
        {linked && (
          <HabitGlyph
            name={linked.name}
            color={linked.color}
            icon={linked.icon}
            className={bare ? "h-3.5 w-3.5" : "h-5 w-5"}
            iconClassName={bare ? "h-2 w-2" : "h-3 w-3"}
          />
        )}
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={title}
          placeholder={placeholder ?? t("tasks.form.titlePlaceholder")}
          role="combobox"
          aria-expanded={showList}
          aria-autocomplete="list"
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={cn(
            "w-full bg-transparent outline-none placeholder:text-muted-foreground",
            bare ? "p-0 text-[15px] leading-7" : "h-full text-sm",
          )}
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
              className={cn(
                "h-4 w-4 transition-transform",
                showList && "rotate-180",
              )}
            />
          </button>
        )}
        </div>
      </Popover.Anchor>

      {/* Список у порталі — не обрізається скрол-контейнерами (модалка/редактор) */}
      <Popover.Portal forceMount>
        <AnimatePresence>
          {showList && (
            <Popover.Content
              asChild
              forceMount
              align="start"
              sideOffset={4}
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={(e) => {
                // Кліки/фокус усередині самого поля не закривають список.
                if (anchorRef.current?.contains(e.target as Node)) {
                  e.preventDefault();
                }
              }}
              style={{ width: "var(--radix-popover-trigger-width)" }}
            >
              <motion.ul
                role="listbox"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
                className="z-50 max-h-48 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-card"
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
            </Popover.Content>
          )}
        </AnimatePresence>
      </Popover.Portal>
    </Popover.Root>
  );
}
