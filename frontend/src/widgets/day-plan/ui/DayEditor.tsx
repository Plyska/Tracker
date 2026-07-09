import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useAddTaskMutation,
  useUpdateTaskMutation,
  type Task,
} from "@/entities/task";
import {
  formatTimeInput,
  parseTimeInput,
  TaskEditorRow,
  TaskTitleField,
} from "@/features/manage-tasks";
import { useGetHabitsQuery } from "@/entities/habit";
import { useAppSelector } from "@/app/store/hooks";
import { cn } from "@/shared/lib";

interface DayEditorProps {
  /** ISO 'YYYY-MM-DD' або null — «Загальна» (задачі без дати). */
  date: string | null;
  tasks: Task[];
  /** Без власної поверхні (рамка/фон/падінг) — для вбудовування (напр. у модалку). */
  bare?: boolean;
}

/** Порядок рядків: виконані вниз; далі за часом (якщо є), за створенням / id. */
const byOrder = (a: Task, b: Task): number => {
  if (!!a.done !== !!b.done) return a.done ? 1 : -1;
  if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
  if (a.startTime) return -1;
  if (b.startTime) return 1;
  if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
  return a.id.localeCompare(b.id);
};

/** Курсор у кінець textarea. */
const focusEnd = (el: HTMLTextAreaElement | undefined | null) => {
  if (!el) return;
  el.focus();
  const len = el.value.length;
  el.setSelectionRange(len, len);
};

/**
 * Редактор дня в стилі щоденної нотатки. Зверху — рядок «Нова задача» (маркер поточного стилю —
 * чекбокс / номер / година — + поле назви з підказками навичок), під пунктирним роздільником —
 * рядки-задачі. Enter у рядку → наступний; Backspace на порожньому → попередній.
 */
export function DayEditor({ date, tasks, bare }: DayEditorProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const style = useAppSelector((s) => s.uiPrefs.taskListStyle);
  const editorScale = useAppSelector((s) => s.uiPrefs.editorScale);
  const { data: habits = [] } = useGetHabitsQuery();
  const [addTask] = useAddTaskMutation();
  const [updateTask] = useUpdateTaskMutation();

  const [draftTitle, setDraftTitle] = useState("");
  const [draftHabit, setDraftHabit] = useState("");
  const [draftTime, setDraftTime] = useState("");
  const [draftDone, setDraftDone] = useState(false);

  // Поточний час для авто-закреслення в «розкладі»; оновлюємо щохвилини (не читаємо в рендері).
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const ordered = [...tasks].sort(byOrder);
  const doneCount = ordered.filter((tk) => tk.done).length;

  // Анімація появи/зникнення/переміщення рядка (як у старому списку).
  const rowMotion = {
    layout: !reduceMotion,
    initial: reduceMotion ? false : { opacity: 0, y: -4 },
    animate: { opacity: 1, y: 0 },
    exit: reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 },
    transition: { duration: 0.18, ease: "easeOut" },
  } as const;

  const rowRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const addBoxRef = useRef<HTMLDivElement>(null);

  const registerRef = useCallback(
    (id: string, el: HTMLTextAreaElement | null) => {
      if (el) rowRefs.current.set(id, el);
      else rowRefs.current.delete(id);
    },
    [],
  );

  const focusNewTask = useCallback(() => {
    addBoxRef.current?.querySelector("input")?.focus();
  }, []);

  // Фокус на рядок за позицією; за межами списку → поле «Нова задача».
  // Без useCallback (залежать від `ordered`, який сортується in-place) — мемоізує React Compiler.
  const focusAt = (index: number) => {
    const id = ordered[index]?.id;
    const el = id ? rowRefs.current.get(id) : undefined;
    // Рядок відсутній (напр. у згорнутій секції виконаних) → поле «Нова задача».
    if (el) focusEnd(el);
    else focusNewTask();
  };

  const onEnter = (id: string) =>
    focusAt(ordered.findIndex((tk) => tk.id === id) + 1);

  const onBackspaceEmpty = (id: string) => {
    const i = ordered.findIndex((tk) => tk.id === id);
    if (i > 0) focusAt(i - 1);
    else focusNewTask();
  };

  const submitDraft = () => {
    const title = draftTitle.trim();
    if (!title) return;
    const parsed = style === "timeline" ? parseTimeInput(draftTime) : "";
    const startTime = parsed && parsed !== "" ? parsed : undefined;
    // Не обрано зі списку, але назва точно збігається з навичкою → лінкуємо її автоматично.
    const matched = habits.find(
      (h) => h.name.trim().toLowerCase() === title.toLowerCase(),
    );
    const habitId = draftHabit || matched?.id || undefined;
    const wasDone = draftDone;
    // Одразу чистимо чернетку (фокус лишається в полі → швидкий ввід наступної).
    setDraftTitle("");
    setDraftHabit("");
    setDraftTime("");
    setDraftDone(false);
    void (async () => {
      try {
        const created = await addTask({ date, title, habitId, startTime }).unwrap();
        if (wasDone) await updateTask({ id: created.id, done: true }).unwrap();
      } catch {
        // помилку покаже глобальний тост-мідлвар
      }
    })();
  };

  return (
    <div
      className={cn(!bare && "rounded-xl bg-card p-3 ring-1 ring-border/60 sm:p-4")}
      style={{ zoom: editorScale }}
    >
      {/* «Нова задача» — рядок у стилі поточного маркера */}
      <div className="flex items-start gap-2 rounded-md py-0.5 pl-1 pr-1">
        {style === "numbered" ? (
          <span className="flex h-7 shrink-0 items-center">
            <span className="min-w-4.5 px-0.5 text-center text-[15px] font-medium tabular-nums text-muted-foreground/70">
              {ordered.length + 1}.
            </span>
          </span>
        ) : style === "timeline" ? (
          <span className="flex h-7 shrink-0 items-center">
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={draftTime}
              placeholder={t("timePicker.placeholder")}
              aria-label={t("tasks.form.startTime")}
              onChange={(e) => setDraftTime(formatTimeInput(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  focusNewTask();
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
            aria-pressed={draftDone}
            aria-label={t("tasks.toggleDone", {
              title: draftTitle || t("planner.newTask"),
            })}
            onClick={() => setDraftDone((d) => !d)}
            className="flex h-7 shrink-0 items-center justify-center rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className={cn(
                "flex h-4.5 w-4.5 items-center justify-center rounded-[5px] border transition-colors",
                draftDone
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input hover:border-primary/60",
              )}
            >
              {draftDone && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
          </button>
        )}

        <div ref={addBoxRef} className="min-w-0 flex-1">
          <TaskTitleField
            bare
            autoFocus={false}
            title={draftTitle}
            habitId={draftHabit}
            placeholder={t("planner.newTask")}
            onChange={(title, id) => {
              setDraftTitle(title);
              setDraftHabit(id);
            }}
            onSubmit={submitDraft}
          />
        </div>
      </div>

      {/* Пунктир власним градієнтом — ширші штрихи, ніж у border-dashed */}
      <div
        className="my-3 h-0.5"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, var(--border) 0 15px, transparent 20px 18px)",
        }}
        aria-hidden
      />

      {/* Рядки-задачі (вигляд маркера обирає тулбар над редактором) */}
      {ordered.length === 0 ? (
        <p className="px-1 py-1 text-sm text-muted-foreground">
          {t("planner.dayEmpty")}
        </p>
      ) : (
        <AnimatePresence initial={false}>
          {ordered.map((task, i) => {
            // Роздільник «Виконані (N)» перед першою виконаною задачею.
            const showDivider = task.done && (i === 0 || !ordered[i - 1].done);
            return (
              <Fragment key={task.id}>
                {showDivider && (
                  <motion.div
                    layout={!reduceMotion}
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="flex items-center gap-2 px-1 pb-1 pt-3 text-xs font-medium text-muted-foreground"
                    aria-hidden
                  >
                    <span className="h-px flex-1 bg-border" />
                    {t("planner.doneSection", { count: doneCount })}
                    <span className="h-px flex-1 bg-border" />
                  </motion.div>
                )}
                <motion.div {...rowMotion}>
                  <TaskEditorRow
                    task={task}
                    index={i + 1}
                    style={style}
                    now={now}
                    registerRef={registerRef}
                    onEnter={onEnter}
                    onBackspaceEmpty={onBackspaceEmpty}
                  />
                </motion.div>
              </Fragment>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}
