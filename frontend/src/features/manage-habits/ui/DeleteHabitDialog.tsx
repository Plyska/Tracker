import { AlertDialog } from "radix-ui";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "@/app/store/hooks";
import { removeHabit, type Habit } from "@/entities/habit";
import { clearHabitEntries } from "@/entities/habit-entry";
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
  const dispatch = useAppDispatch();

  const onConfirm = () => {
    dispatch(removeHabit(habit.id));
    dispatch(clearHabitEntries(habit.id));
    onOpenChange(false);
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <AlertDialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-border bg-card p-6 text-card-foreground shadow-card",
          )}
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
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
