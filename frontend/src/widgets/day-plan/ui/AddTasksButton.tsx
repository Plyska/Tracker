import { useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAddTaskMutation, useUpdateTaskMutation } from "@/entities/task";
import { useGetHabitsQuery } from "@/entities/habit";
import {
  formatTimeInput,
  parseTimeInput,
  TaskTitleField,
} from "@/features/manage-tasks";
import { TaskListStyleSwitcher } from "@/features/ui-prefs";
import { useAppSelector } from "@/app/store/hooks";
import { Button, DatePicker, IconButton } from "@/shared/ui";
import { cn } from "@/shared/lib";

interface DraftLine {
  key: number;
  title: string;
  habitId: string;
  done: boolean;
  time: string;
}

const emptyLine = (key: number): DraftLine => ({
  key,
  title: "",
  habitId: "",
  done: false,
  time: "",
});

/**
 * Кнопка + модалка додавання задач: список рядків, біля кожного — маркер поточного стилю
 * (чекбокс / номер / час), а поле назви з підказками навичок. Enter — новий рядок (нова задача),
 * Backspace на порожньому — прибрати. «Додати» створює всі непорожні рядки для обраного дня.
 */
export function AddTasksButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const style = useAppSelector((s) => s.uiPrefs.taskListStyle);
  const { data: habits = [] } = useGetHabitsQuery();
  const [addTask] = useAddTaskMutation();
  const [updateTask] = useUpdateTaskMutation();

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(""); // '' = «Загальна» (без дати)
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(0)]);

  const keyRef = useRef(1);
  const rowRefs = useRef(new Map<number, HTMLDivElement>());

  const close = () => {
    setOpen(false);
    setDate("");
    setLines([emptyLine(0)]);
    keyRef.current = 1;
  };

  const focusLine = (key: number) => {
    requestAnimationFrame(() => {
      const el = rowRefs.current.get(key)?.querySelector("input");
      if (!(el instanceof HTMLInputElement)) return;
      el.focus();
      const n = el.value.length;
      el.setSelectionRange(n, n);
    });
  };

  const setLine = (key: number, patch: Partial<DraftLine>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const addLineAfter = (key: number) => {
    const newKey = keyRef.current++;
    const i = lines.findIndex((l) => l.key === key);
    setLines((ls) => {
      const next = [...ls];
      next.splice(i + 1, 0, emptyLine(newKey));
      return next;
    });
    focusLine(newKey);
  };

  const removeLine = (key: number) => {
    const i = lines.findIndex((l) => l.key === key);
    if (lines.length === 1 || i < 0) return;
    const prev = lines[i - 1];
    setLines((ls) => ls.filter((l) => l.key !== key));
    if (prev) focusLine(prev.key);
  };

  const hasContent = lines.some((l) => l.title.trim() !== "");

  const onAdd = () => {
    const d = date === "" ? null : date;
    const valid = lines.filter((l) => l.title.trim() !== "");
    if (valid.length === 0) return;
    // Створюємо ПОСЛІДОВНО, щоб серверний createdAt ішов у порядку введення (інакше порядок «стрибає»).
    void (async () => {
      for (const l of valid) {
        const title = l.title.trim();
        const parsed = style === "timeline" ? parseTimeInput(l.time) : "";
        const startTime = parsed && parsed !== "" ? parsed : undefined;
        // Обрано зі списку — беремо; інакше автолінк за точним збігом назви.
        const matched = habits.find(
          (h) => h.name.trim().toLowerCase() === title.toLowerCase(),
        );
        const habitId = l.habitId || matched?.id || undefined;
        try {
          const created = await addTask({
            date: d,
            title,
            habitId,
            startTime,
          }).unwrap();
          if (l.done) await updateTask({ id: created.id, done: true }).unwrap();
        } catch {
          // помилку покаже глобальний тост-мідлвар
        }
      }
    })();
    close();
  };

  const content = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
      };

  return (
    <>
      <Button className={className} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {t("tasks.add")}
      </Button>

      <Dialog.Root open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <AnimatePresence>
          {open && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  className="fixed inset-0 z-50 bg-black/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.32, ease: "easeOut" }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild forceMount>
                <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div
                    aria-describedby={undefined}
                    className={cn(
                      "pointer-events-auto flex max-h-[85vh] w-full max-w-md flex-col",
                      "rounded-xl border border-border bg-card p-6 text-card-foreground shadow-card",
                    )}
                    initial={content.initial}
                    animate={content.animate}
                    exit={content.exit}
                    transition={{ duration: 0.32, ease: "easeOut" }}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <Dialog.Title className="text-lg font-semibold">
                        {t("tasks.form.addTitle")}
                      </Dialog.Title>
                      <div className="flex items-center gap-1">
                        <TaskListStyleSwitcher layoutId="add-tasks-style-pill" />
                        <Dialog.Close asChild>
                          <IconButton aria-label={t("common.close")}>
                            <X className="h-4 w-4" />
                          </IconButton>
                        </Dialog.Close>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="mb-1.5 block text-sm font-medium">
                        {t("tasks.form.day")}
                      </label>
                      <DatePicker
                        value={date}
                        onChange={setDate}
                        clearable
                        placeholder={t("tasks.form.noDay")}
                        className="w-full justify-start"
                      />
                    </div>

                    <label className="mb-1.5 block text-sm font-medium">
                      {t("planner.tasksLabel")}
                    </label>
                    {/* Рядки задач: маркер поточного стилю + поле назви з підказками навичок */}
                    <div className="-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1">
                      {lines.map((line, i) => (
                        <div
                          key={line.key}
                          className="flex items-start gap-2 py-0.5"
                        >
                          {style === "numbered" ? (
                            <span className="flex h-7 shrink-0 items-center">
                              <span className="min-w-4.5 px-0.5 text-center text-[15px] font-medium tabular-nums text-muted-foreground">
                                {i + 1}.
                              </span>
                            </span>
                          ) : style === "timeline" ? (
                            <span className="flex h-7 shrink-0 items-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={5}
                                value={line.time}
                                placeholder={t("timePicker.placeholder")}
                                aria-label={t("tasks.form.startTime")}
                                onChange={(e) =>
                                  setLine(line.key, {
                                    time: formatTimeInput(e.target.value),
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    focusLine(line.key);
                                  }
                                }}
                                className={cn(
                                  "w-14 rounded border-0 bg-transparent p-0 text-center font-mono text-[13px] leading-7 tabular-nums text-muted-foreground outline-none",
                                  "placeholder:text-muted-foreground/50 hover:bg-muted/60 focus:bg-muted/60 focus:text-foreground",
                                )}
                              />
                            </span>
                          ) : (
                            <button
                              type="button"
                              aria-pressed={line.done}
                              aria-label={t("tasks.toggleDone", {
                                title: line.title || t("planner.newTask"),
                              })}
                              onClick={() => setLine(line.key, { done: !line.done })}
                              className="flex h-7 shrink-0 items-center justify-center rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <span
                                className={cn(
                                  "flex h-4.5 w-4.5 items-center justify-center rounded-[5px] border transition-colors",
                                  line.done
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-input hover:border-primary/60",
                                )}
                              >
                                {line.done && (
                                  <Check className="h-3 w-3" strokeWidth={3} />
                                )}
                              </span>
                            </button>
                          )}

                          <div
                            ref={(el) => {
                              if (el) rowRefs.current.set(line.key, el);
                              else rowRefs.current.delete(line.key);
                            }}
                            className="min-w-0 flex-1"
                          >
                            <TaskTitleField
                              bare
                              autoFocus={i === 0}
                              title={line.title}
                              habitId={line.habitId}
                              placeholder={i === 0 ? t("planner.newTask") : ""}
                              onChange={(title, habitId) => {
                                setLine(line.key, { title, habitId });
                                // Обрав навичку зі списку → зберегти рядок і перейти на наступний.
                                if (habitId) addLineAfter(line.key);
                              }}
                              onSubmit={() => addLineAfter(line.key)}
                              onBackspaceEmpty={() => removeLine(line.key)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      <Dialog.Close asChild>
                        <Button variant="outline">{t("common.cancel")}</Button>
                      </Dialog.Close>
                      <Button onClick={onAdd} disabled={!hasContent}>
                        {t("common.add")}
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </>
  );
}
