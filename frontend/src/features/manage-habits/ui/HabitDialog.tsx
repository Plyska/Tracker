import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  randomHabitColor,
  resolveHabitIcon,
  useAddHabitMutation,
  useUpdateHabitMutation,
  type Habit,
} from "@/entities/habit";
import { Button, IconButton, InfoHint } from "@/shared/ui";
import {
  cn,
  useEntitlement,
  hoursToMinutes,
  minutesToHoursLabel,
} from "@/shared/lib";
import { habitFormSchema, type HabitFormValues } from "../model/schema";
import { ColorPicker } from "./ColorPicker";
import { IconPicker } from "./IconPicker";
import { HabitPreview } from "./HabitPreview";

interface HabitDialogProps {
  mode: "create" | "edit";
  habit?: Habit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const inputClass = cn(
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none",
  "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
);

// Пресети тижневої цілі часової навички (у ГОДИНАХ). Клік → зберігаємо в хвилинах (год×60).
const HOUR_PRESETS = [1, 2, 3, 5, 7, 10, 14, 20] as const;
const DEFAULT_TIMED_MINUTES = 5 * 60; // 5 год/тиждень — стартовий пресет
const DEFAULT_WEEKLY_COUNT = 3;

type FreqValue = { weeklyTarget: number | null; weeklyMinutesTarget: number | null };
type FreqMode = "daily" | "count" | "timed";

const freqModeOf = (v: FreqValue): FreqMode =>
  v.weeklyMinutesTarget != null ? "timed" : v.weeklyTarget != null ? "count" : "daily";

/**
 * Частота звички — три взаємовиключні режими (ADR 0010 + 0011):
 *  - «Щоденна» (обидві цілі null), «N разів на тиждень» (weeklyTarget 1..6),
 *  - «Годин на тиждень» (weeklyMinutesTarget — часова навичка: у таблиці замість галочки — години).
 * Впливає на те, як рахується статистика — пояснення в тултіпі біля поля.
 */
function FrequencyField({
  value,
  onChange,
}: {
  value: FreqValue;
  onChange: (v: FreqValue) => void;
}) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const mode = freqModeOf(value);

  // Ручний ввід годин (окрім пресетів). Локальний рядок, щоб дозволити проміжне редагування («2.», «»).
  const parseHours = (raw: string): number => parseFloat(raw.replace(",", "."));
  const [hoursInput, setHoursInput] = useState(
    value.weeklyMinutesTarget != null
      ? minutesToHoursLabel(value.weeklyMinutesTarget)
      : "",
  );
  // Скидаємо інпут, коли ціль змінили ЗЗОВНІ (клік по пресету / відкриття edit) — патерн React
  // «adjust state during render» (без ефекту, без каскадних ререндерів).
  const [prevTarget, setPrevTarget] = useState(value.weeklyMinutesTarget);
  if (value.weeklyMinutesTarget !== prevTarget) {
    setPrevTarget(value.weeklyMinutesTarget);
    const fromInput =
      hoursInput === "" ? null : hoursToMinutes(parseHours(hoursInput));
    if (value.weeklyMinutesTarget !== fromInput) {
      setHoursInput(
        value.weeklyMinutesTarget != null
          ? minutesToHoursLabel(value.weeklyMinutesTarget)
          : "",
      );
    }
  }

  const onHoursInput = (raw: string) => {
    setHoursInput(raw);
    const n = parseHours(raw);
    if (!Number.isNaN(n) && n > 0) {
      onChange({
        weeklyTarget: null,
        weeklyMinutesTarget: Math.min(hoursToMinutes(n), 10080),
      });
    }
  };

  const segClass = (active: boolean) =>
    cn(
      "h-9 rounded-md border px-1 text-sm font-medium transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      active
        ? "border-primary bg-primary/10 text-foreground"
        : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    );

  const hint =
    mode === "count"
      ? t("habits.form.freqWeeklyHint", { count: value.weeklyTarget ?? 0 })
      : mode === "timed"
        ? t("habits.form.freqHoursHint", {
            hours: minutesToHoursLabel(value.weeklyMinutesTarget ?? 0),
          })
        : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium">{t("habits.form.frequency")}</span>
        <AnimatePresence initial={false}>
          {hint && (
            <motion.span
              key="freq-hint"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex"
            >
              <InfoHint label={hint} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          aria-pressed={mode === "daily"}
          onClick={() => onChange({ weeklyTarget: null, weeklyMinutesTarget: null })}
          className={segClass(mode === "daily")}
        >
          {t("habits.form.freqDaily")}
        </button>
        <button
          type="button"
          aria-pressed={mode === "count"}
          onClick={() =>
            onChange({
              weeklyTarget: value.weeklyTarget ?? DEFAULT_WEEKLY_COUNT,
              weeklyMinutesTarget: null,
            })
          }
          className={segClass(mode === "count")}
        >
          {/* Коротка форма на вузькій колонці (уникаємо overflow), повна — на lg+. */}
          <span className="lg:hidden">{t("habits.form.freqWeeklyShort")}</span>
          <span className="hidden lg:inline">{t("habits.form.freqWeekly")}</span>
        </button>
        <button
          type="button"
          aria-pressed={mode === "timed"}
          onClick={() =>
            onChange({
              weeklyTarget: null,
              weeklyMinutesTarget: value.weeklyMinutesTarget ?? DEFAULT_TIMED_MINUTES,
            })
          }
          className={segClass(mode === "timed")}
        >
          <span className="lg:hidden">{t("habits.form.freqHoursShort")}</span>
          <span className="hidden lg:inline">{t("habits.form.freqHours")}</span>
        </button>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {mode === "count" && (
          <motion.div
            key="weekly-picker"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div
              className="grid grid-cols-6 gap-1.5 pt-1"
              role="group"
              aria-label={t("habits.form.freqTimesPerWeek")}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={value.weeklyTarget === n}
                  onClick={() => onChange({ weeklyTarget: n, weeklyMinutesTarget: null })}
                  className={cn(
                    "flex h-8 w-full items-center justify-center rounded-md border text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    value.weeklyTarget === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {mode === "timed" && (
          <motion.div
            key="hours-picker"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div
              className="grid grid-cols-4 gap-1.5 pt-1"
              role="group"
              aria-label={t("habits.form.freqHoursPerWeek")}
            >
              {HOUR_PRESETS.map((h) => {
                const minutes = hoursToMinutes(h);
                const active = value.weeklyMinutesTarget === minutes;
                return (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onChange({ weeklyTarget: null, weeklyMinutesTarget: minutes })
                    }
                    className={cn(
                      "flex h-8 w-full items-center justify-center rounded-md border text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {t("habits.form.hoursShort", { count: h })}
                  </button>
                );
              })}
            </div>

            {/* Ручний ввід: користувач задає свою кількість годин на тиждень. */}
            <div className="flex items-center gap-2 pt-2">
              <label
                htmlFor="freq-hours-custom"
                className="text-xs text-muted-foreground"
              >
                {t("habits.form.customHours")}
              </label>
              <input
                id="freq-hours-custom"
                type="number"
                inputMode="decimal"
                min={0.5}
                step={0.5}
                value={hoursInput}
                onChange={(e) => onHoursInput(e.target.value)}
                className="h-8 w-20 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-xs text-muted-foreground">
                {t("habits.form.hoursUnit")}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HabitForm({
  mode,
  habit,
  onDone,
  showAppearance,
}: {
  mode: "create" | "edit";
  habit?: Habit;
  onDone: () => void;
  showAppearance: boolean;
}) {
  const { t } = useTranslation();
  const [addHabit] = useAddHabitMutation();
  const [updateHabit] = useUpdateHabitMutation();
  const canCustomize = useEntitlement("customization");

  const { register, handleSubmit, control, setValue, formState } =
    useForm<HabitFormValues>({
      resolver: zodResolver(habitFormSchema),
      defaultValues:
        mode === "edit" && habit
          ? {
              name: habit.name,
              color: habit.color,
              icon: habit.icon ?? null,
              weeklyTarget: habit.weeklyTarget,
              weeklyMinutesTarget: habit.weeklyMinutesTarget,
            }
          : {
              name: "",
              color: randomHabitColor(),
              icon: null,
              weeklyTarget: null,
              weeklyMinutesTarget: null,
            },
    });

  // Pro: чи перевизначив користувач іконку вручну. На edit вважаємо встановленою.
  const [iconTouched, setIconTouched] = useState(mode === "edit");

  const name = useWatch({ control, name: "name" });
  const color = useWatch({ control, name: "color" });
  const icon = useWatch({ control, name: "icon" });
  const weeklyTarget = useWatch({ control, name: "weeklyTarget" });
  const weeklyMinutesTarget = useWatch({ control, name: "weeklyMinutesTarget" });

  // Auto-suggest: Free — завжди похідна від назви; Pro — поки не перевизначено.
  useEffect(() => {
    if (!canCustomize || !iconTouched) {
      setValue("icon", resolveHabitIcon(name));
    }
  }, [name, canCustomize, iconTouched, setValue]);

  const onSubmit = handleSubmit((values) => {
    if (mode === "create") {
      void addHabit({
        name: values.name,
        color: values.color,
        icon: values.icon,
        weeklyTarget: values.weeklyTarget,
        weeklyMinutesTarget: values.weeklyMinutesTarget,
      });
    } else if (habit) {
      // Часткове оновлення одним PATCH (§5.2 контракту): name + color + icon + обидві цілі
      // (шлемо обидві — одна завжди null — щоб зміна типу зчистила протилежну ціль).
      void updateHabit({
        id: habit.id,
        name: values.name,
        color: values.color,
        icon: values.icon,
        weeklyTarget: values.weeklyTarget,
        weeklyMinutesTarget: values.weeklyMinutesTarget,
      });
    }
    onDone();
  });

  // Вміст панелі «Вигляд» — спільний для мобільного (статично) і десктопного (анімовано) варіантів.
  const appearanceContent = canCustomize ? (
    <>
      <ColorPicker value={color} onChange={(c) => setValue("color", c)} />
      <IconPicker
        value={icon}
        onChange={(i) => {
          setIconTouched(true);
          setValue("icon", i);
        }}
      />
    </>
  ) : (
    <p className="text-xs text-muted-foreground">{t("habits.form.proHint")}</p>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        {/* Ліва частина: прев'ю + назва + частота. Фіксована ширина на sm+; layout — щоб при
            layout-анімації картки ліва колонка не «стискалася» (framer компенсує масштаб). */}
        <motion.div layout className="w-full space-y-4 sm:w-96">
          <HabitPreview name={name} color={color} icon={icon} />
          <div className="flex flex-col gap-2">
            <label htmlFor="habit-name" className="text-sm font-medium">
              {t("habits.form.name")}
            </label>
            <input
              id="habit-name"
              autoFocus
              placeholder={t("habits.form.namePlaceholder")}
              className={inputClass}
              aria-invalid={!!formState.errors.name}
              aria-describedby={
                formState.errors.name ? "habit-name-error" : undefined
              }
              {...register("name")}
            />
            {formState.errors.name && (
              <p id="habit-name-error" className="text-xs text-destructive">
                {t("habits.form.nameRequired")}
              </p>
            )}
          </div>

          <FrequencyField
            value={{ weeklyTarget, weeklyMinutesTarget }}
            onChange={(v) => {
              setValue("weeklyTarget", v.weeklyTarget);
              setValue("weeklyMinutesTarget", v.weeklyMinutesTarget);
            }}
          />
        </motion.div>

        {/* Мобільний: панель «Вигляд» завжди видима (без анімації), стоїть під основним блоком. */}
        <div className="w-full space-y-4 sm:hidden">{appearanceContent}</div>

        {/* Десктоп (sm+): панель монтується/розмонтовується миттєво, а розмір і перецентрування
            картки плавно анімує `layout` — і на відкритті, і на закритті (без стрибків висоти).
            `layout` на самій панелі — щоб її вміст не спотворювався під час анімації. */}
        {showAppearance && (
          <motion.div layout className="hidden shrink-0 sm:block">
            <div className="w-96 space-y-4 pl-2">{appearanceContent}</div>
          </motion.div>
        )}
      </div>

      {/* На малих екранах кнопки однакові й на всю ширину (flex-1); на sm+ — природна ширина праворуч. */}
      <div className="flex gap-2 border-t border-border pt-4 sm:justify-end">
        <Dialog.Close asChild>
          <Button variant="outline" className="flex-1 sm:flex-none">
            {t("common.cancel")}
          </Button>
        </Dialog.Close>
        <Button type="submit" className="flex-1 sm:flex-none">
          {t(mode === "create" ? "common.add" : "common.save")}
        </Button>
      </div>
    </form>
  );
}

/** Add/Edit навички. Free: лише назва (авто-колір + авто-іконка/монограма).
 * Pro: colorpicker + icon picker з auto-suggest як стартовим пресетом. */
export function HabitDialog({
  mode,
  habit,
  open,
  onOpenChange,
}: HabitDialogProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  // Панель «Вигляд» прихована за замовчуванням; тумблер у формі її розкриває (модалка розширюється).
  const [showAppearance, setShowAppearance] = useState(false);
  // Скидаємо стан при кожному відкритті — патерн «adjust state during render» (без ефекту).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setShowAppearance(false);
  }

  // Центрування — через flex-обгортку (не transform), щоб не конфліктувати з layout-анімацією
  // картки. Поява/зникнення: fade + легкий scale-pop.
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
            {/* Content — повноекранна flex-обгортка (центрує картку без transform, щоб не заважати
                layout-анімації). pointer-events-none → кліки повз картку йдуть до Overlay (закриття). */}
            <Dialog.Content asChild forceMount>
              <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                layout
                className={cn(
                  "pointer-events-auto max-h-[calc(100dvh-2rem)] overflow-y-auto",
                  // Мобільний: фіксована ширина, обидві частини — одна під одною (завжди видимі).
                  // sm+: ширина за вмістом (w-auto) → росте РАЗОМ із панеллю. layout плавно анімує
                  // зміну розміру Й перецентрування (жодних стрибків висоти).
                  "w-[calc(100%-2rem)] sm:w-auto sm:max-w-[calc(100vw-2rem)]",
                  "rounded-xl border border-border bg-card p-6 text-card-foreground shadow-card",
                )}
                initial={content.initial}
                animate={content.animate}
                exit={content.exit}
                transition={{ duration: 0.32, ease: "easeOut" }}
              >
                <div className="mb-4 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Dialog.Title className="text-lg font-semibold">
                {t(
                  mode === "create"
                    ? "habits.form.addTitle"
                    : "habits.form.editTitle",
                )}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                {t("habits.form.subtitle")}
              </Dialog.Description>
            </div>
            {/* Іконка-розширювач панелі «Вигляд» — лише на sm+ (на мобільному обидві частини видимі
                завжди). Замість крестика — модалку закриває кнопка «Скасувати». */}
            <IconButton
              type="button"
              onClick={() => setShowAppearance((v) => !v)}
              aria-expanded={showAppearance}
              aria-label={t("habits.form.customizeAppearance")}
              title={t("habits.form.customizeAppearance")}
              className={cn("hidden sm:inline-flex", showAppearance && "bg-accent/60")}
            >
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform",
                  showAppearance && "rotate-180",
                )}
              />
            </IconButton>
          </div>

                <HabitForm
                  mode={mode}
                  habit={habit}
                  onDone={() => onOpenChange(false)}
                  showAppearance={showAppearance}
                />
              </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
