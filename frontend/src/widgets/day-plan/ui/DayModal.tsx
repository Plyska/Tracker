import { useState } from "react";
import { AlertDialog, Dialog } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useClearTasksMutation, type Task } from "@/entities/task";
import { AddTaskButton } from "@/features/manage-tasks";
import { Button, IconButton } from "@/shared/ui";
import { cn, fromISODate, getDateFnsLocale, isToday } from "@/shared/lib";
import { TaskList } from "./TaskList";

interface DayModalProps {
  /** ISO 'YYYY-MM-DD' або null — «Загальна» картка. */
  date: string | null;
  tasks: Task[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Повний список задач дня (або «Загальної») у модалці — відкривається кліком по стікеру. */
export function DayModal({ date, tasks, open, onOpenChange }: DayModalProps) {
  const { t, i18n } = useTranslation();
  const locale = getDateFnsLocale(i18n.language);
  const reduceMotion = useReducedMotion();
  const [clearTasks] = useClearTasksMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const general = date === null;
  const today = !general && isToday(fromISODate(date));
  const heading = general
    ? t("planner.general")
    : format(fromISODate(date), "EEEE, d MMMM", { locale });

  const onClearCard = () => {
    void clearTasks(general ? { general: true } : { date: date! });
    setConfirmOpen(false);
    onOpenChange(false);
  };

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
                  "fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-md flex-col",
                  "rounded-xl border border-border bg-card p-6 text-card-foreground shadow-card",
                )}
                initial={content.initial}
                animate={content.animate}
                exit={content.exit}
                transition={{ duration: 0.32, ease: "easeOut" }}
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex items-baseline gap-2">
                    <Dialog.Title className="text-lg font-semibold capitalize">
                      {heading}
                    </Dialog.Title>
                    {today && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {t("toolbar.today")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {tasks.length > 0 && (
                      <IconButton
                        aria-label={t("planner.deleteCard")}
                        title={t("planner.deleteCard")}
                        onClick={() => setConfirmOpen(true)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    )}
                    <Dialog.Close asChild>
                      <IconButton aria-label={t("common.close")}>
                        <X className="h-4 w-4" />
                      </IconButton>
                    </Dialog.Close>
                  </div>
                </div>

                <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
                  <TaskList tasks={tasks} />
                </div>

                <div className="mt-4 flex justify-end">
                  <AddTaskButton date={date ?? undefined} />
                </div>

                <AlertDialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
                  <AnimatePresence>
                    {confirmOpen && (
                      <AlertDialog.Portal forceMount>
                        <AlertDialog.Overlay asChild forceMount>
                          <motion.div
                            className="fixed inset-0 z-60 bg-black/50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.32, ease: "easeOut" }}
                          />
                        </AlertDialog.Overlay>
                        <AlertDialog.Content asChild forceMount>
                          <motion.div
                            className={cn(
                              "fixed left-1/2 top-1/2 z-60 w-[calc(100%-2rem)] max-w-sm",
                              "rounded-xl border border-border bg-card p-6 text-card-foreground shadow-card",
                            )}
                            initial={content.initial}
                            animate={content.animate}
                            exit={content.exit}
                            transition={{ duration: 0.32, ease: "easeOut" }}
                          >
                            <AlertDialog.Title className="text-lg font-semibold">
                              {t("planner.deleteCard")}
                            </AlertDialog.Title>
                            <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                              {t("planner.deleteCardConfirm", {
                                name: heading,
                                count: tasks.length,
                              })}
                            </AlertDialog.Description>
                            <div className="mt-6 flex justify-end gap-2">
                              <AlertDialog.Cancel asChild>
                                <Button variant="outline">
                                  {t("common.cancel")}
                                </Button>
                              </AlertDialog.Cancel>
                              <AlertDialog.Action asChild>
                                <Button
                                  onClick={onClearCard}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t("tasks.menu.delete")}
                                </Button>
                              </AlertDialog.Action>
                            </div>
                          </motion.div>
                        </AlertDialog.Content>
                      </AlertDialog.Portal>
                    )}
                  </AnimatePresence>
                </AlertDialog.Root>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
