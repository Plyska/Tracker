import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Dialog } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  MoodPicker,
  useUpsertDailyLogMutation,
  type DailyLog,
} from "@/entities/daily-log";
import { Button, DatePicker, IconButton } from "@/shared/ui";
import { RichTextEditor, isRichTextEmpty } from "@/shared/ui/RichTextEditor";
import { addDaysISO, cn, todayISODate } from "@/shared/lib";
import "./diary.css";

interface DiaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Дата, з якої відкрити щоденник (ISO 'YYYY-MM-DD'). */
  initialDate: string;
  /** Наявні записи за датою — для префілу сторінки будь-якого дня. */
  existingByDate: Record<string, DailyLog>;
}

/** Поля сторінки (настрій + текст + дії). Ремаунтиться при зміні дати → префіл наявним. */
function DiaryFields({
  date,
  source,
  onDone,
}: {
  date: string;
  source?: DailyLog;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [mood, setMood] = useState<number | undefined>(source?.mood);
  const [notes, setNotes] = useState(source?.notes ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [upsert, { isLoading }] = useUpsertDailyLogMutation();

  const canSave = !!mood && !isRichTextEmpty(notes) && !isLoading;

  const save = async () => {
    if (!mood) return;
    await upsert({ date, mood, notes })
      .unwrap()
      .then(onDone)
      .catch(() => {});
  };

  // Видалення = прибрати нотатку (настрій дня лишається для статистики).
  const remove = async () => {
    await upsert({ date, mood: mood ?? source?.mood ?? 3, notes: "" })
      .unwrap()
      .then(onDone)
      .catch(() => {});
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{t("mood.prompt")}</span>
        <MoodPicker value={mood} onChange={setMood} />
      </div>

      <RichTextEditor
        value={source?.notes ?? ""}
        onChange={setNotes}
        placeholder={t("diary.placeholder")}
        defaultToolbarOpen={!source}
        className="diary-editor min-h-0 min-w-0 flex-1"
      />

      {confirmDelete ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-sm text-muted-foreground">
            {t("diary.deleteConfirm")}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDelete(false)}
            disabled={isLoading}
          >
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            onClick={remove}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("common.delete")}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {source && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {t("common.delete")}
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm">
                {t("common.cancel")}
              </Button>
            </Dialog.Close>
            <Button size="sm" onClick={save} disabled={!canSave}>
              {source ? t("common.save") : t("diary.addEntry")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Бічна стрілка навігації між днями. */
function NavArrow({
  side,
  disabled,
  onClick,
  label,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none",
        "transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-25",
      )}
    >
      {side === "left" ? (
        <ChevronLeft className="h-5 w-5" />
      ) : (
        <ChevronRight className="h-5 w-5" />
      )}
    </button>
  );
}

/**
 * Вміст модалки (монтується лише коли відкрито, keyed по даті відкриття → стан свіжий без ефектів).
 * Стрілки/клавіші ←→ гортають будь-який день; стара сторінка «перегортається» по діагоналі,
 * нова — просто проявляється (fade).
 */
function DiaryDialogInner({
  initialDate,
  existingByDate,
  reduceMotion,
  onClose,
}: {
  initialDate: string;
  existingByDate: Record<string, DailyLog>;
  reduceMotion: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const today = todayISODate();
  const rootRef = useRef<HTMLDivElement>(null);

  const [date, setDate] = useState(initialDate);

  const source = existingByDate[date];
  const canNewer = date < today;

  // Тримаємо фокус на контейнері (для клавіш ←/→), а не на кнопці закриття.
  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  const focusRoot = () => rootRef.current?.focus();
  const older = () => {
    setDate(addDaysISO(date, -1));
    focusRoot();
  };
  const newer = () => {
    if (canNewer) {
      setDate(addDaysISO(date, 1));
      focusRoot();
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const el = e.target as HTMLElement | null;
    // Не перехоплюємо стрілки під час набору тексту / у полях.
    if (
      el?.closest(
        'input, textarea, select, [contenteditable="true"], .ProseMirror',
      )
    )
      return;
    e.preventDefault();
    if (e.key === "ArrowLeft") older();
    else newer();
  };

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="flex min-h-0 flex-1 flex-col outline-none"
    >
      <Dialog.Close asChild>
        <IconButton aria-label={t("common.close")} className="absolute right-4 top-4">
          <X className="h-4 w-4" />
        </IconButton>
      </Dialog.Close>

      <Dialog.Title className="sr-only">{t("nav.diary")}</Dialog.Title>

      {/* Дата по центру + стрілки по боках */}
      <div className="mb-4 flex items-center justify-center gap-1 sm:gap-2">
        <NavArrow
          side="left"
          disabled={false}
          onClick={older}
          label={t("diary.prevEntry")}
        />
        <DatePicker
          value={date}
          onChange={(d) => {
            if (d) setDate(d);
          }}
          triggerFormat="EEEE, d MMMM yyyy"
        />
        <NavArrow
          side="right"
          disabled={!canNewer}
          onClick={newer}
          label={t("diary.nextEntry")}
        />
      </div>

      {/* Область сторінки: перехід між днями — той самий, що між сторінками застосунку. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={date}
            className="flex min-h-0 flex-1 flex-col"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
          >
            <DiaryFields date={date} source={source} onDone={onClose} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Модалка-«сторінка» щоденника для конкретного дня (з навігацією по днях і перегортанням). */
export function DiaryDialog({
  open,
  onOpenChange,
  initialDate,
  existingByDate,
}: DiaryDialogProps) {
  const reduceMotion = useReducedMotion();

  const shell = reduceMotion
    ? {
        initial: { opacity: 0, x: "-50%", y: "-50%" },
        animate: { opacity: 1, x: "-50%", y: "-50%" },
        exit: { opacity: 0, x: "-50%", y: "-50%" },
      }
    : {
        initial: { opacity: 0, scale: 0.96, x: "-50%", y: "-50%" },
        animate: { opacity: 1, scale: 1, x: "-50%", y: "-50%" },
        exit: { opacity: 0, scale: 0.96, x: "-50%", y: "-50%" },
      };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
            <Dialog.Content
              asChild
              forceMount
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <motion.div
                aria-describedby={undefined}
                className={cn(
                  "fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl flex-col",
                  "rounded-xl border border-border bg-card p-6 text-card-foreground shadow-card",
                )}
                initial={shell.initial}
                animate={shell.animate}
                exit={shell.exit}
                transition={{ duration: 0.32, ease: "easeOut" }}
              >
                <DiaryDialogInner
                  key={initialDate}
                  initialDate={initialDate}
                  existingByDate={existingByDate}
                  reduceMotion={!!reduceMotion}
                  onClose={() => onOpenChange(false)}
                />
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
