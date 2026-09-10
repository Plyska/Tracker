import { useState } from "react";
import { Dialog } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAiPrefs, useSetAiPrefs, type AddressForm } from "@/entities/ai";
import { Button, IconButton } from "@/shared/ui";
import { cn } from "@/shared/lib";
import { addressFormNeeded } from "../lib/addressForm";
import { AddressFormPicker } from "./AddressFormPicker";
import { BetaBadge } from "./BetaBadge";

interface AiConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Викликається після успішного вмикання — щоб одразу згенерувати перший лист. */
  onEnabled?: () => void;
}

/**
 * Вміст екрана — окремий компонент, змонтований ЛИШЕ поки діалог відкритий.
 *
 * Це не структурна косметика. Екран показується вже не тільки при першій згоді: якщо форми
 * звертання немає, він відкривається й із тумблера в Налаштуваннях. А отже поля мусять щоразу
 * стартувати з ПОТОЧНИХ налаштувань, а не з нулів — інакше людина з увімкненим доступом до
 * щоденника, повторно натиснувши «Увімкнути», тихо його втратила б. Монтування на кожне
 * відкриття дає це задарма: ініціалізатори `useState` відпрацьовують заново, без ефектів-синхронів.
 */
function ConsentBody({ onOpenChange, onEnabled }: Omit<AiConsentDialogProps, "open">) {
  const { t, i18n } = useTranslation();
  const prefs = useAiPrefs();
  const [diaryOptIn, setDiaryOptIn] = useState(prefs.diaryOptIn);
  // Наперед не вибрано нічого: варіантів два, і будь-який дефолт тут — здогадка про людину.
  // Поки не обрано, кнопка неактивна (див. `needsAddress`).
  const [addressForm, setAddressForm] = useState<AddressForm | null>(prefs.addressForm);
  const needsAddress = addressFormNeeded(i18n.language);
  const [setAiPrefs, { isLoading }] = useSetAiPrefs();

  const onAccept = async () => {
    await setAiPrefs({
      aiEnabled: true,
      aiDiaryOptIn: diaryOptIn,
      // Англійський інтерфейс форми не питає — тоді поле просто не надсилаємо («не питали»).
      ...(addressForm ? { aiAddressForm: addressForm } : {}),
    });
    onOpenChange(false);
    onEnabled?.();
  };

  return (
    <>
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
        <AddressFormPicker value={addressForm} onChange={setAddressForm} />

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50">
          <input
            type="checkbox"
            checked={diaryOptIn}
            onChange={(e) => setDiaryOptIn(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
          />
          <span>
            <span className="font-medium">{t("ai.consent.diaryLabel")}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{t("ai.diaryHint")}</span>
          </span>
        </label>
      </div>

      <div className="mt-6 flex gap-2 border-t border-border pt-4 sm:justify-end">
        <Dialog.Close asChild>
          <Button variant="outline" className="flex-1 sm:flex-none">
            {t("common.cancel")}
          </Button>
        </Dialog.Close>
        <Button
          onClick={() => void onAccept()}
          // Без форми звертання помічника не вмикаємо взагалі: безродовий режим модель не
          // витримує — у прогоні рід прорвався в кризову відповідь 3 рази з 3.
          disabled={isLoading || (needsAddress && addressForm === null)}
          className="flex-1 sm:flex-none"
        >
          {t("ai.consent.accept")}
        </Button>
      </div>
    </>
  );
}

/**
 * Екран згоди на AI-помічника (ADR 0012).
 *
 * Це НЕ тумблер, а окремий екран, бо рішення стосується передачі персональних даних третій
 * стороні.
 *
 * Текст свідомо короткий: довгі абзаци на екрані згоди не читають, а нечитаний абзац не робить
 * згоду поінформованою — він лише створює її вигляд. Тому лишилось те, без чого рішення ухвалити
 * не можна: **що бачить** помічник і **куди йдуть дані**.
 *
 * Друге тепер живе в підказці біля щоденника — це ЄДИНЕ місце, де сказано про зовнішній сервіс.
 * Прибираючи звідти цю фразу, екран перестає розкривати передачу даних узагалі.
 *
 * Щоденник — окремий чекбокс, ВИМКНЕНИЙ за замовчуванням: це найособистіше, що ми надсилаємо.
 */
export function AiConsentDialog({ open, onOpenChange, onEnabled }: AiConsentDialogProps) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();

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
                aria-label={t("ai.consent.title")}
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
                <ConsentBody onOpenChange={onOpenChange} onEnabled={onEnabled} />
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
