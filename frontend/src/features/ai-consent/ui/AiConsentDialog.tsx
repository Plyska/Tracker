import { useState } from "react";
import { Dialog } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSetAiPrefs } from "@/entities/ai";
import { Button, IconButton } from "@/shared/ui";
import { cn } from "@/shared/lib";
import { BetaBadge } from "./BetaBadge";

interface AiConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Викликається після успішного вмикання — щоб одразу згенерувати перший лист. */
  onEnabled?: () => void;
}

/**
 * Екран згоди на AI-помічника (ADR 0012).
 *
 * Це НЕ тумблер, а окремий екран, бо рішення стосується передачі персональних даних третій
 * стороні. Два факти, які тут заборонено ховати (план §3.6): запити можуть використовуватись
 * для вдосконалення моделей і вибірково їх можуть переглядати співробітники. Решта тексту
 * навмисно спокійна: починаємо з користі, нормалізуємо, завершуємо контролем.
 *
 * Щоденник — окремий чекбокс, ВИМКНЕНИЙ за замовчуванням: це найособистіше, що ми надсилаємо.
 */
export function AiConsentDialog({
  open,
  onOpenChange,
  onEnabled,
}: AiConsentDialogProps) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [diaryOptIn, setDiaryOptIn] = useState(false);
  const [setAiPrefs, { isLoading }] = useSetAiPrefs();

  const onAccept = async () => {
    await setAiPrefs({ aiEnabled: true, aiDiaryOptIn: diaryOptIn });
    onOpenChange(false);
    onEnabled?.();
  };

  const content = reduce
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
                  "fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto",
                  "rounded-xl border border-border bg-card p-6 text-card-foreground shadow-card",
                )}
                initial={content.initial}
                animate={content.animate}
                exit={content.exit}
                transition={{ duration: 0.32, ease: "easeOut" }}
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Dialog.Title className="flex items-center gap-2 text-lg font-semibold">
                      <Sparkles className="h-5 w-5 text-primary" aria-hidden />
                      {t("ai.consent.title")}
                      <BetaBadge />
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-muted-foreground">
                      {t("ai.consent.sees")}
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <IconButton aria-label={t("common.close")}>
                      <X className="h-4 w-4" />
                    </IconButton>
                  </Dialog.Close>
                </div>

                <div className="space-y-4 text-sm">
                  <p className="rounded-lg border border-border bg-background p-3 leading-relaxed text-muted-foreground">
                    {t("ai.consent.testing")}
                  </p>

                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50">
                    <input
                      type="checkbox"
                      checked={diaryOptIn}
                      onChange={(e) => setDiaryOptIn(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                    />
                    <span>
                      <span className="font-medium">{t("ai.consent.diaryLabel")}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {t("ai.diaryHint")}
                      </span>
                    </span>
                  </label>

                  <p className="text-xs text-muted-foreground">
                    {t("ai.consent.control")}
                  </p>
                </div>

                <div className="mt-6 flex gap-2 border-t border-border pt-4 sm:justify-end">
                  <Dialog.Close asChild>
                    <Button variant="outline" className="flex-1 sm:flex-none">
                      {t("common.cancel")}
                    </Button>
                  </Dialog.Close>
                  <Button
                    onClick={() => void onAccept()}
                    disabled={isLoading}
                    className="flex-1 sm:flex-none"
                  >
                    {t("ai.consent.accept")}
                  </Button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
