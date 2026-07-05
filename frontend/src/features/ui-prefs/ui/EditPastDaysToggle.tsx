import { Switch } from "radix-ui";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { cn } from "@/shared/lib/cn";
import { setAllowEditingPastDays } from "../model/uiPrefsSlice";

/**
 * Тумблер «редагувати минулі дні» (Radix Switch) — за патерном ThemeToggle, без іконок.
 * Типово вимкнено: змінювати відмітки можна лише за сьогодні; увімкнення дозволяє минулі дні.
 */
export function EditPastDaysToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const allow = useAppSelector((s) => s.uiPrefs.allowEditingPastDays);
  const dispatch = useAppDispatch();
  const reduceMotion = useReducedMotion();
  const label = t("settings.editPastDays.title");

  const slide = reduceMotion
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 500, damping: 32 } as const);

  return (
    <Switch.Root
      asChild
      checked={allow}
      onCheckedChange={(v) => dispatch(setAllowEditingPastDays(v))}
      aria-label={label}
      title={label}
    >
      <motion.button
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        className={cn(
          "inline-flex h-7 w-13 shrink-0 cursor-pointer items-center rounded-full",
          "border-2 border-transparent outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "data-[state=unchecked]:bg-muted data-[state=checked]:bg-primary",
          className,
        )}
      >
        <Switch.Thumb asChild>
          <motion.span
            className="h-5 w-5 rounded-full bg-card shadow-card"
            initial={false}
            animate={{ x: allow ? 28 : 0 }}
            transition={slide}
          />
        </Switch.Thumb>
      </motion.button>
    </Switch.Root>
  );
}
