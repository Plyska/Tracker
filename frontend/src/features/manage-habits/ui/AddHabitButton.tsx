import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui";
import { HabitDialog } from "./HabitDialog";

export function AddHabitButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button className={className} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {t("habits.add")}
      </Button>
      <HabitDialog mode="create" open={open} onOpenChange={setOpen} />
    </>
  );
}
