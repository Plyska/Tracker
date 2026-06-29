import { useState } from "react";
import { DropdownMenu } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HabitGlyph, useGetHabitsQuery } from "@/entities/habit";
import { useUpdateTaskMutation, type Task } from "@/entities/task";
import { IconButton } from "@/shared/ui";
import { cn } from "@/shared/lib";
import { TaskDialog } from "./TaskDialog";
import { DeleteTaskDialog } from "./DeleteTaskDialog";

const menuItemClass = cn(
  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
);

/**
 * Рядок задачі: клік по всьому рядку перемикає `done` (без чекбокса). Виконані — приглушені
 * (як disabled) і закреслені, сортуються вниз. Меню edit/delete — окремою кнопкою.
 */
export function TaskItem({ task }: { task: Task }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [updateTask] = useUpdateTaskMutation();
  const { data: habits = [] } = useGetHabitsQuery();
  const habit = task.habitId ? habits.find((h) => h.id === task.habitId) : undefined;

  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const timeLabel = task.startTime
    ? task.endTime
      ? `${task.startTime}–${task.endTime}`
      : task.startTime
    : null;

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-lg border border-border bg-card pl-3 pr-1 transition-colors",
          task.done && "border-border/60 bg-muted/30",
        )}
      >
        <button
          type="button"
          aria-pressed={task.done}
          aria-label={t("tasks.toggleDone", { title: task.title })}
          onClick={() => void updateTask({ id: task.id, done: !task.done })}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {timeLabel && (
            <span
              className={cn(
                "shrink-0 font-mono text-xs tabular-nums text-muted-foreground",
                task.done && "line-through",
              )}
            >
              {timeLabel}
            </span>
          )}

          {/* Гліф навички — кольоровий маркер (назва вже в тексті задачі) */}
          {habit && (
            <HabitGlyph
              name={habit.name}
              color={habit.color}
              icon={habit.icon}
              className={cn("h-4 w-4 shrink-0", task.done && "opacity-50")}
              iconClassName="h-2.5 w-2.5"
            />
          )}

          <span
            className={cn(
              "min-w-0 flex-1 wrap-break-word text-base",
              task.done && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </span>
        </button>

        <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenu.Trigger asChild>
            <IconButton
              size="sm"
              aria-label={t("tasks.menu.label")}
              className="shrink-0 text-muted-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal forceMount>
            <AnimatePresence>
              {menuOpen && (
                <DropdownMenu.Content asChild forceMount align="end" sideOffset={4}>
                  <motion.div
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                    animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    style={{
                      transformOrigin:
                        "var(--radix-dropdown-menu-content-transform-origin)",
                    }}
                    className="z-50 min-w-40 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-card"
                  >
                    <DropdownMenu.Item
                      className={menuItemClass}
                      onSelect={() => setEditOpen(true)}
                    >
                      <Pencil className="h-4 w-4" />
                      {t("tasks.menu.edit")}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className={cn(
                        menuItemClass,
                        "text-destructive data-highlighted:text-destructive",
                      )}
                      onSelect={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("tasks.menu.delete")}
                    </DropdownMenu.Item>
                  </motion.div>
                </DropdownMenu.Content>
              )}
            </AnimatePresence>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <TaskDialog
        mode="edit"
        task={task}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteTaskDialog task={task} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
