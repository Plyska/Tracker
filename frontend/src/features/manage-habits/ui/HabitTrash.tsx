import { useTranslation } from "react-i18next";
import { RotateCcw, Trash2 } from "lucide-react";
import {
  HabitGlyph,
  useDeleteHabitMutation,
  useGetTrashedHabitsQuery,
  useRestoreHabitMutation,
} from "@/entities/habit";
import { Button, Skeleton } from "@/shared/ui";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysLeft = (purgeAt: string): number =>
  Math.max(0, Math.ceil((new Date(purgeAt).getTime() - Date.now()) / DAY_MS));

/**
 * Кошик видалених навичок (Settings). Навичка живе тут обмежений час, після чого зникає
 * назавжди (retention — на бекенді). Дії: відновити або видалити негайно.
 */
export function HabitTrash() {
  const { t } = useTranslation();
  const { data: habits, isLoading } = useGetTrashedHabitsQuery();
  const [restore] = useRestoreHabitMutation();
  const [remove] = useDeleteHabitMutation();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{t("trash.title")}</h3>
        <p className="text-sm text-muted-foreground">{t("trash.description")}</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : !habits?.length ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          {t("trash.empty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {habits.map((h) => {
            const left = daysLeft(h.purgeAt);
            return (
              <li
                key={h.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <HabitGlyph
                  name={h.name}
                  color={h.color}
                  icon={h.icon}
                  className="size-9"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{h.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {left === 0
                      ? t("trash.expiresToday")
                      : t("trash.daysLeft", { count: left })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void restore(h.id)}
                >
                  <RotateCcw className="size-4" />
                  {t("trash.restore")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t("trash.deleteForever")}
                  title={t("trash.deleteForever")}
                  onClick={() => void remove({ id: h.id, permanent: true })}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
