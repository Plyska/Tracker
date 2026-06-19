import { AlertDialog } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useDeleteHabitMutation, type Habit } from "@/entities/habit";
import { Button } from "@/shared/ui";
import { cn } from "@/shared/lib";

interface DeleteHabitDialogProps {
  habit: Habit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteHabitDialog({
  habit,
  open,
  onOpenChange,
}: DeleteHabitDialogProps) {
  const { t } = useTranslation();
  const [deleteHabit] = useDeleteHabitMutation();
  const reduceMotion = useReducedMotion();

  // Каскадне видалення entries — на боці сервера (db), інвалідація тегів оновить таблицю.
  const onConfirm = () => {
    void deleteHabit(habit.id);
    onOpenChange(false);
  };

  // Та сама анімація, що й у HabitDialog: fade overlay + scale-pop контенту.
  // Центрування лишається на Motion (x/y: -50%), бо `transform` від Motion перетер
  // би Tailwind-класи `-translate-*`.
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
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <AlertDialog.Portal forceMount>
            <AlertDialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
              />
            </AlertDialog.Overlay>
            <AlertDialog.Content asChild forceMount>
              <motion.div
                className={cn(
                  "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm",
                  "rounded-xl border border-border bg-card p-6 text-card-foreground shadow-card",
                )}
                initial={content.initial}
                animate={content.animate}
                exit={content.exit}
                transition={{ duration: 0.32, ease: "easeOut" }}
              >
                <AlertDialog.Title className="text-lg font-semibold">
                  {t("habits.delete.title")}
                </AlertDialog.Title>
                <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                  {t("habits.delete.description", { name: habit.name })}
                </AlertDialog.Description>
                <div className="mt-6 flex justify-end gap-2">
                  <AlertDialog.Cancel asChild>
                    <Button variant="outline">{t("common.cancel")}</Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <Button
                      onClick={onConfirm}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("habits.menu.delete")}
                    </Button>
                  </AlertDialog.Action>
                </div>
              </motion.div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        )}
      </AnimatePresence>
    </AlertDialog.Root>
  );
}
