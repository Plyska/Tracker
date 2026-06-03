import { useState, type ReactNode } from "react";
import { DropdownMenu } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { type Habit } from "@/entities/habit";
import { IconButton } from "@/shared/ui";
import { cn } from "@/shared/lib";
import { HabitDialog } from "./HabitDialog";
import { DeleteHabitDialog } from "./DeleteHabitDialog";

const itemClass = cn(
  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
);

type Props = {
  habit: Habit;
  /** Кастомний тригер (напр. вся шапка колонки в rows-вигляді). За замовч. — кебаб ⋮. */
  trigger?: ReactNode;
};

export function HabitRowMenu({ habit, trigger }: Props) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild>
          {trigger ?? (
            <IconButton
              size="sm"
              aria-label={t("habits.menu.label")}
              className="-mr-2 -ml-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 md:mr-0 md:ml-0"
            >
              <MoreVertical className="h-4 w-4" />
            </IconButton>
          )}
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal forceMount>
          <AnimatePresence>
            {menuOpen && (
              <DropdownMenu.Content
                asChild
                forceMount
                align={trigger ? "center" : "end"}
                sideOffset={4}
              >
                {/* Та сама поява, що й у HabitDialog: fade + scale-pop. Origin —
                    від кнопки ⋮ (Radix CSS-змінна), тож меню «розкривається» з тригера. */}
                <motion.div
                  initial={
                    reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }
                  }
                  animate={
                    reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }
                  }
                  exit={
                    reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }
                  }
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  style={{
                    transformOrigin:
                      "var(--radix-dropdown-menu-content-transform-origin)",
                  }}
                  className="z-50 min-w-40 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-card"
                >
                  <DropdownMenu.Item
                    className={itemClass}
                    onSelect={() => setEditOpen(true)}
                  >
                    <Pencil className="h-4 w-4" />
                    {t("habits.menu.edit")}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={cn(
                      itemClass,
                      "text-destructive data-highlighted:text-destructive",
                    )}
                    onSelect={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("habits.menu.delete")}
                  </DropdownMenu.Item>
                </motion.div>
              </DropdownMenu.Content>
            )}
          </AnimatePresence>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <HabitDialog
        mode="edit"
        habit={habit}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteHabitDialog
        habit={habit}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
