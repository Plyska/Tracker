import { Dialog } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useAddTaskMutation,
  useUpdateTaskMutation,
  type Task,
} from "@/entities/task";
import { Button, DatePicker, IconButton, TimePicker } from "@/shared/ui";
import { cn } from "@/shared/lib";
import { taskFormSchema, type TaskFormValues } from "../model/schema";
import { TaskTitleField } from "./TaskTitleField";

interface TaskDialogProps {
  mode: "create" | "edit";
  task?: Task;
  /** День, до якого створюється задача (для mode="create"). */
  date?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// '' → null для wire-формату (зняти час/навичку).
const orNull = (v: string): string | null => (v ? v : null);

function TaskForm({
  mode,
  task,
  date,
  onDone,
}: {
  mode: "create" | "edit";
  task?: Task;
  date?: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [addTask] = useAddTaskMutation();
  const [updateTask] = useUpdateTaskMutation();

  const { handleSubmit, control, formState, setValue } =
    useForm<TaskFormValues>({
      resolver: zodResolver(taskFormSchema),
      defaultValues:
        mode === "edit" && task
          ? {
              date: task.date,
              title: task.title,
              startTime: task.startTime ?? "",
              endTime: task.endTime ?? "",
              habitId: task.habitId ?? "",
            }
          : {
              date: date ?? "", // '' = без дати → «Загальна» картка
              title: "",
              startTime: "",
              endTime: "",
              habitId: "",
            },
    });

  const title = useWatch({ control, name: "title" });
  const habitId = useWatch({ control, name: "habitId" });

  const onSubmit = handleSubmit((values) => {
    if (mode === "create") {
      void addTask({
        date: orNull(values.date),
        title: values.title,
        startTime: orNull(values.startTime),
        endTime: orNull(values.endTime),
        habitId: orNull(values.habitId),
      });
    } else if (task) {
      void updateTask({
        id: task.id,
        date: orNull(values.date),
        title: values.title,
        startTime: orNull(values.startTime),
        endTime: orNull(values.endTime),
        habitId: orNull(values.habitId),
      });
    }
    onDone();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">{t("tasks.form.day")}</label>
        <Controller
          control={control}
          name="date"
          render={({ field }) => (
            <DatePicker
              value={field.value}
              onChange={field.onChange}
              clearable
              placeholder={t("tasks.form.noDay")}
              className="w-full justify-start"
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">{t("tasks.form.title")}</label>
        <TaskTitleField
          title={title}
          habitId={habitId}
          onChange={(nextTitle, nextHabitId) => {
            setValue("title", nextTitle, { shouldValidate: true });
            setValue("habitId", nextHabitId);
          }}
          invalid={!!formState.errors.title}
          describedBy={formState.errors.title ? "task-title-error" : undefined}
        />
        {formState.errors.title ? (
          <p id="task-title-error" className="text-xs text-destructive">
            {t(formState.errors.title.message ?? "tasks.form.titleRequired")}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("tasks.form.titleHint")}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <label className="text-sm font-medium">{t("tasks.form.startTime")}</label>
          <Controller
            control={control}
            name="startTime"
            render={({ field }) => (
              <TimePicker value={field.value} onChange={field.onChange} />
            )}
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <label className="text-sm font-medium">{t("tasks.form.endTime")}</label>
          <Controller
            control={control}
            name="endTime"
            render={({ field }) => (
              <TimePicker
                value={field.value}
                onChange={field.onChange}
                aria-invalid={!!formState.errors.endTime}
              />
            )}
          />
        </div>
      </div>
      {formState.errors.endTime && (
        <p className="text-xs text-destructive">
          {t(formState.errors.endTime.message ?? "tasks.form.timeRange")}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t("tasks.form.timeHint")}</p>

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

/** Add/Edit задачі. Час необов'язковий (з ним — розпорядок, без — список справ). */
export function TaskDialog({
  mode,
  task,
  date,
  open,
  onOpenChange,
}: TaskDialogProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

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
                          ? "tasks.form.addTitle"
                          : "tasks.form.editTitle",
                      )}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-muted-foreground">
                      {t("tasks.form.subtitle")}
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <IconButton aria-label={t("common.close")}>
                      <X className="h-4 w-4" />
                    </IconButton>
                  </Dialog.Close>
                </div>

                <TaskForm
                  mode={mode}
                  task={task}
                  date={date}
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
