import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, IconButton } from "@/shared/ui";
import { TaskDialog } from "./TaskDialog";

interface AddTaskButtonProps {
  /** День, до якого створюється задача; undefined → без дати («Загальна» картка). */
  date?: string;
  className?: string;
  /** Компактний режим — icon-only (для шапки картки-дня). */
  compact?: boolean;
}

export function AddTaskButton({ date, className, compact }: AddTaskButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      {compact ? (
        <IconButton
          size="sm"
          aria-label={t("tasks.add")}
          title={t("tasks.add")}
          className={className}
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </IconButton>
      ) : (
        <Button className={className} onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("tasks.add")}
        </Button>
      )}
      <TaskDialog mode="create" date={date} open={open} onOpenChange={setOpen} />
    </>
  );
}
