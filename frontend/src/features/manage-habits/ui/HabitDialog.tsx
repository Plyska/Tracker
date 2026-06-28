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
import { Button, IconButton } from "@/shared/ui";
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
          ? { name: habit.name, color: habit.color, icon: habit.icon ?? null }
          : { name: "", color: randomHabitColor(), icon: null },
    });

  // Pro: чи перевизначив користувач іконку вручну. На edit вважаємо встановленою.
  const [iconTouched, setIconTouched] = useState(mode === "edit");

  const name = useWatch({ control, name: "name" });
  const color = useWatch({ control, name: "color" });
  const icon = useWatch({ control, name: "icon" });

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
      });
    } else if (habit) {
      // Часткове оновлення одним PATCH (§5.2 контракту): name + color + icon.
      void updateHabit({
        id: habit.id,
        name: values.name,
        color: values.color,
        icon: values.icon,
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
