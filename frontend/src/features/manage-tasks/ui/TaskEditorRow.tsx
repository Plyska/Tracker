import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DropdownMenu } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HabitGlyph, useGetHabitsQuery } from "@/entities/habit";
import {
  useDeleteTaskMutation,
  useUpdateTaskMutation,
  type Task,
} from "@/entities/task";
import { cn } from "@/shared/lib";
import type { TaskListStyle } from "@/features/ui-prefs";
import { formatTimeInput, parseTimeInput } from "../lib/parseTime";
import { TaskDialog } from "./TaskDialog";
import { DeleteTaskDialog } from "./DeleteTaskDialog";

interface TaskEditorRowProps {
  task: Task;
  /** 1-based позиція (для нумерованого стилю). */
  index: number;
  style: TaskListStyle;
  /** Поточний час (ms) — для авто-закреслення в «розкладі». Передає контейнер (не читаємо в рендері). */
  now: number;
  /** Реєстрація textarea в контейнері для керування фокусом. */
  registerRef: (id: string, el: HTMLTextAreaElement | null) => void;
  /** Enter у кінці рядка → перейти до наступного рядка / чернетки. */
  onEnter: (id: string) => void;
  /** Backspace на порожньому рядку → перейти до попереднього (рядок видалиться на blur). */
  onBackspaceEmpty: (id: string) => void;
}

const menuItemClass = cn(
  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
);

/** Підігнати висоту textarea під вміст (рядок росте з текстом, без внутрішнього скролу). */
const autoGrow = (el: HTMLTextAreaElement) => {
  el.style.height = "0px";
  el.style.height = `${el.scrollHeight}px`;
};

/** Debounce автозбереження назви під час набору (blur зберігає миттєво). */
const TITLE_SAVE_DELAY = 600;

/**
 * Рядок редактора у стилі документа: маркер (чекбокс / номер) + інлайн-textarea назви, без
 * «коробки». Клік по тексту — курсор і редагування на місці; commit на blur (порожньо →
 * видалити). Enter/Backspace — навігація рядками (контейнер). Меню (олівець/кошик) — на hover.
 */
export function TaskEditorRow({
  task,
  index,
  style,
  now,
  registerRef,
  onEnter,
  onBackspaceEmpty,
}: TaskEditorRowProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const { data: habits = [] } = useGetHabitsQuery();
  const habit = task.habitId ? habits.find((h) => h.id === task.habitId) : undefined;

  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const ref = useRef<HTMLTextAreaElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    registerRef(task.id, ref.current);
    return () => registerRef(task.id, null);
  }, [task.id, registerRef]);

  // Скасувати відкладене збереження при демонтажі рядка.
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  useLayoutEffect(() => {
    if (ref.current) autoGrow(ref.current);
  }, [task.title]);

  const timeLabel = task.startTime
    ? task.endTime
      ? `${task.startTime}–${task.endTime}`
      : task.startTime
    : null;

  // У режимі «розклад» закреслюємо автоматично, коли година задачі вже минула (для дня з датою).
  const passed =
    style === "timeline" &&
    !!task.date &&
    !!task.startTime &&
    now > 0 &&
    new Date(`${task.date}T${task.startTime}`).getTime() < now;
  const struck = task.done || passed;

  // Автозбереження назви під час набору (debounced): порожнє не чіпаємо — видалення лише на blur.
  const scheduleSave = (raw: string) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const value = raw.trim();
      if (value !== "" && value !== task.title) {
        void updateTask({ id: task.id, title: value });
      }
    }, TITLE_SAVE_DELAY);
  };

  const commit = () => {
    clearTimeout(saveTimer.current); // скасувати відкладене — зберігаємо миттєво
    const value = ref.current?.value.trim() ?? "";
    if (value === task.title) return;
    if (value === "") void deleteTask(task.id);
    else void updateTask({ id: task.id, title: value });
  };

  // Інлайн-редагування години (timeline): нормалізуємо ввід; невалідне — відкочуємо.
  const commitTime = () => {
    const el = timeRef.current;
    if (!el) return;
    const parsed = parseTimeInput(el.value);
    const current = task.startTime ?? "";
    if (parsed === null) {
      el.value = current; // відкотити невалідне
      return;
    }
    el.value = parsed; // показати нормалізоване
    if (parsed !== current) {
      void updateTask({ id: task.id, startTime: parsed === "" ? null : parsed });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); // без переносу рядка — Enter створює/переходить до наступної задачі
      onEnter(task.id);
      return;
    }
    const el = e.currentTarget;
    if (
      e.key === "Backspace" &&
      el.value === "" &&
      el.selectionStart === 0 &&
      el.selectionEnd === 0
    ) {
      e.preventDefault();
      onBackspaceEmpty(task.id);
    }
  };

  return (
    <>
      <div className="group relative flex items-start gap-2 rounded-md py-0.5 pl-1 pr-8 transition-colors hover:bg-muted/30">
        {/* Маркер (чекбокс / номер) — лише поза «розкладом»; у timeline завершення авто, за часом */}
        {style !== "timeline" && (
          <button
            type="button"
            key={style}
            aria-pressed={task.done}
            aria-label={t("tasks.toggleDone", { title: task.title })}
            onClick={() => void updateTask({ id: task.id, done: !task.done })}
            className="flex h-7 shrink-0 items-center justify-center rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {style === "numbered" ? (
              <span className="min-w-4.5 px-0.5 text-center text-[15px] font-medium tabular-nums text-muted-foreground">
                {index}.
              </span>
            ) : (
              <span
                className={cn(
                  "flex h-4.5 w-4.5 items-center justify-center rounded-[5px] border transition-colors",
                  task.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input hover:border-primary/60",
                )}
              >
                {task.done && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
            )}
          </button>
        )}

        {/* Час: у «розкладі» — редагований інпут; інакше — read-only мітка (якщо є) */}
        {style === "timeline" ? (
          <span className="flex h-7 shrink-0 items-center">
            <input
              ref={timeRef}
              key={task.startTime ?? ""}
              type="text"
              inputMode="numeric"
              maxLength={5}
              defaultValue={task.startTime ?? ""}
              placeholder={t("timePicker.placeholder")}
              aria-label={t("tasks.form.startTime")}
              onChange={(e) => {
                e.currentTarget.value = formatTimeInput(e.currentTarget.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitTime();
                  ref.current?.focus();
                }
              }}
              onBlur={commitTime}
              className={cn(
                "w-14 rounded border-0 bg-transparent p-0 text-center font-mono text-[13px] leading-7 tabular-nums text-muted-foreground outline-none",
                "placeholder:text-muted-foreground/50 hover:bg-muted/60 focus:bg-muted/60 focus:text-foreground",
                struck && "line-through",
              )}
            />
          </span>
        ) : (
          timeLabel && (
            <span
              className={cn(
                "flex h-7 shrink-0 items-center font-mono text-[13px] tabular-nums text-muted-foreground",
                struck && "line-through",
              )}
            >
              {timeLabel}
            </span>
          )
        )}

        {/* Іконка навички — безпосередньо перед назвою */}
        {habit && (
          <span className="flex h-7 shrink-0 items-center">
            <HabitGlyph
              name={habit.name}
              color={habit.color}
              icon={habit.icon}
              className={cn("h-3.5 w-3.5", struck && "opacity-60")}
              iconClassName="h-2 w-2"
            />
          </span>
        )}

        <textarea
          ref={ref}
          rows={1}
          defaultValue={task.title}
          aria-label={t("tasks.form.title")}
          onInput={(e) => {
            autoGrow(e.currentTarget);
            scheduleSave(e.currentTarget.value);
          }}
          onKeyDown={onKeyDown}
          onBlur={commit}
          className={cn(
            "min-w-0 flex-1 resize-none border-0 bg-transparent p-0 text-[15px] leading-7 outline-none",
            "placeholder:text-muted-foreground",
            struck && "text-muted-foreground line-through",
          )}
        />

        {/* Меню рядка — приховане, зʼявляється на hover/фокус (Notion-стиль) */}
        <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={t("tasks.menu.label")}
              className={cn(
                "absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded text-muted-foreground outline-none transition-opacity",
                "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
                menuOpen && "opacity-100",
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal forceMount>
            <AnimatePresence>
              {menuOpen && (
                <DropdownMenu.Content asChild forceMount align="end" sideOffset={4}>
                  <motion.div
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                    animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    style={{
                      transformOrigin:
                        "var(--radix-dropdown-menu-content-transform-origin)",
                    }}
                    className="z-50 min-w-40 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-card"
                  >
                    <DropdownMenu.Item
                      className={menuItemClass}
                      onSelect={() => setEditOpen(true)}
                    >
                      <Pencil className="h-4 w-4" />
                      {t("tasks.menu.edit")}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className={cn(
                        menuItemClass,
                        "text-destructive data-highlighted:text-destructive",
                      )}
                      onSelect={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("tasks.menu.delete")}
                    </DropdownMenu.Item>
                  </motion.div>
                </DropdownMenu.Content>
              )}
            </AnimatePresence>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <TaskDialog mode="edit" task={task} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteTaskDialog task={task} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
