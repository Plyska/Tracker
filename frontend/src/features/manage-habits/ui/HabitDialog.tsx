import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  HabitGlyph,
  randomHabitColor,
  resolveHabitIcon,
  useAddHabitMutation,
  useUpdateHabitMutation,
  type Habit,
} from "@/entities/habit";
import { Button, IconButton, InfoHint } from "@/shared/ui";
import { cn, useEntitlement } from "@/shared/lib";
import { habitFormSchema, type HabitFormValues } from "../model/schema";
import { ColorPicker } from "./ColorPicker";
import { IconPicker } from "./IconPicker";

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

/**
 * Частота звички: «Щоденна» (weeklyTarget=null) або «N разів на тиждень» (1..6; 7× = щодня → окрема
 * опція). Тижнева ціль впливає на те, як рахується статистика (ADR 0010) — пояснення в тултіпі біля поля.
 */
function FrequencyField({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const isWeekly = value != null;

  const segClass = (active: boolean) =>
    cn(
      "h-9 rounded-md border text-sm font-medium transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      active
        ? "border-primary bg-primary/10 text-foreground"
        : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium">{t("habits.form.frequency")}</span>
        <AnimatePresence initial={false}>
          {isWeekly && (
            <motion.span
              key="freq-hint"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex"
            >
              <InfoHint
                label={t("habits.form.freqWeeklyHint", { count: value ?? 0 })}
              />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={!isWeekly}
          onClick={() => onChange(null)}
          className={segClass(!isWeekly)}
        >
          {t("habits.form.freqDaily")}
        </button>
        <button
          type="button"
          aria-pressed={isWeekly}
          onClick={() => onChange(value ?? 3)}
          className={segClass(isWeekly)}
        >
          {t("habits.form.freqWeekly")}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isWeekly && (
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
                  aria-pressed={value === n}
                  onClick={() => onChange(n)}
                  className={cn(
                    "flex h-8 w-full items-center justify-center rounded-md border text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    value === n
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
      </AnimatePresence>
    </div>
  );
}

function HabitForm({
  mode,
  habit,
  onDone,
}: {
  mode: "create" | "edit";
  habit?: Habit;
  onDone: () => void;
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
            }
          : {
              name: "",
              color: randomHabitColor(),
              icon: null,
              weeklyTarget: null,
            },
    });

  // Pro: чи перевизначив користувач іконку вручну. На edit вважаємо встановленою.
  const [iconTouched, setIconTouched] = useState(mode === "edit");

  const name = useWatch({ control, name: "name" });
  const color = useWatch({ control, name: "color" });
  const icon = useWatch({ control, name: "icon" });
  const weeklyTarget = useWatch({ control, name: "weeklyTarget" });

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
      });
    } else if (habit) {
      // Часткове оновлення одним PATCH (§5.2 контракту): name + color + icon + weeklyTarget.
      void updateHabit({
        id: habit.id,
        name: values.name,
        color: values.color,
        icon: values.icon,
        weeklyTarget: values.weeklyTarget,
      });
    }
    onDone();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-col gap-3">
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

      {/* Живий прев'ю чіпа навички */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
        <HabitGlyph
          name={name || "?"}
          color={color}
          icon={icon}
          className="h-10 w-10"
          iconClassName="h-5 w-5"
        />
        <span className="truncate text-sm font-medium">
          {name || t("habits.form.preview")}
        </span>
      </div>

      <FrequencyField
        value={weeklyTarget}
        onChange={(v) => setValue("weeklyTarget", v)}
      />

      {canCustomize ? (
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
        <p className="text-xs text-muted-foreground">
          {t("habits.form.proHint")}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Dialog.Close asChild>
          <Button variant="outline">{t("common.cancel")}</Button>
        </Dialog.Close>
        <Button type="submit">
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

  // Центрування лишається на Motion (x/y: -50%), бо `transform` від Motion
  // перетер би Tailwind-класи `-translate-*`. Поява: fade + легкий scale-pop.
  const content = reduceMotion
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
            <Dialog.Content asChild forceMount>
              <motion.div
                className={cn(
                  "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md",
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
            <Dialog.Close asChild>
              <IconButton aria-label={t("common.close")}>
                <X className="h-4 w-4" />
              </IconButton>
            </Dialog.Close>
          </div>

                <HabitForm
                  mode={mode}
                  habit={habit}
                  onDone={() => onOpenChange(false)}
                />
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
