import { useState } from "react";
import { Switch } from "radix-ui";
import { useTranslation } from "react-i18next";
import {
  useAiPrefs,
  useSetAiPrefs,
  useDeleteAiDataMutation,
  useGetAiQuotaQuery,
  hasHiddenInsights,
  restoreAllInsights,
} from "@/entities/ai";
import { AnimatedText, Button, toast } from "@/shared/ui";
import { cn, todayISODate } from "@/shared/lib";
import { AddressFormPicker } from "./AddressFormPicker";
import { AiConsentDialog } from "./AiConsentDialog";
import { BetaBadge } from "./BetaBadge";

/** Тумблер у стилі решти Settings (Radix Switch на токенах). */
function Toggle({
  checked,
  onCheckedChange,
  disabled,
  label,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        checked ? "bg-primary" : "bg-muted",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <Switch.Thumb
        className={cn(
          "block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5.5",
        )}
      />
    </Switch.Root>
  );
}

/**
 * Картка «AI-помічник» у Settings → «Додаток» (ADR 0012).
 *
 * Перше вмикання йде через екран згоди, а не тумблер — рішення про передачу даних третій
 * стороні потребує пояснення. Далі тумблер працює звичайно.
 * Тумблер щоденника лишається доступним і на безкоштовному тирі (інформована згода): поруч
 * висить чесна підказка, що записи теж проходять через провайдера.
 */
export function AiSettingsCard() {
  const { t } = useTranslation();
  const { enabled, diaryOptIn, addressForm, consentAt } = useAiPrefs();
  const [setAiPrefs] = useSetAiPrefs();
  const [deleteAiData, { isLoading: deleting }] = useDeleteAiDataMutation();
  const today = todayISODate();
  const { data: quota } = useGetAiQuotaQuery({ today }, { skip: !enabled });
  const [consentOpen, setConsentOpen] = useState(false);
  // Приховані підказки живуть у localStorage — стану React немає, тож перечитуємо через лічильник.
  const [revision, setRevision] = useState(0);
  void revision;
  const hasHidden = hasHiddenInsights(today);

  const onToggleEnabled = (next: boolean) => {
    // Згоди ще не було → замість тихого вмикання показуємо екран із поясненням.
    if (next && !consentAt) {
      setConsentOpen(true);
      return;
    }
    void setAiPrefs({ aiEnabled: next }).catch(() => {});
  };

  const onDelete = async () => {
    const res = await deleteAiData().unwrap();
    toast.success(t("ai.settings.deleted", { count: res.deletedReflections }));
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <AnimatedText>{t("ai.settings.title")}</AnimatedText>
            <BetaBadge />
          </h3>
          <p className="text-sm text-muted-foreground">
            <AnimatedText>{t("ai.settings.description")}</AnimatedText>
          </p>
        </div>
        <Toggle
          checked={enabled}
          onCheckedChange={onToggleEnabled}
          label={t("ai.settings.title")}
        />
      </div>

      <div className="mt-4 space-y-4">
        <div
          className={cn(
            "flex items-start justify-between gap-4 rounded-lg border border-border p-3 transition-opacity",
            !enabled && "pointer-events-none opacity-50",
          )}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{t("ai.consent.diaryLabel")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("ai.diaryHint")}</p>
          </div>
          <Toggle
            checked={diaryOptIn}
            onCheckedChange={(v) => void setAiPrefs({ aiDiaryOptIn: v }).catch(() => {})}
            disabled={!enabled}
            label={t("ai.consent.diaryLabel")}
          />
        </div>

        <AddressFormPicker
          value={addressForm}
          onChange={(v) => void setAiPrefs({ aiAddressForm: v }).catch(() => {})}
          disabled={!enabled}
        />

        {enabled && quota && (
          <p className="text-xs text-muted-foreground">
            {t("ai.quota.status", { used: quota.used, limit: quota.limit })}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          {/* Кнопка є лише коли справді щось приховано — інакше вона нічого не означає. */}
          {hasHidden && (
            <Button
              variant="outline"
              onClick={() => {
                restoreAllInsights();
                setRevision((r) => r + 1);
                toast.success(t("ai.insights.restored"));
              }}
              className="w-full sm:w-auto"
            >
              {t("ai.insights.restoreAll")}
            </Button>
          )}
          <Button
            variant="outline"
            disabled={deleting}
            onClick={() => void onDelete()}
            className="w-full sm:w-auto"
          >
            {t("ai.settings.deleteData")}
          </Button>
        </div>
      </div>

      <AiConsentDialog open={consentOpen} onOpenChange={setConsentOpen} />
    </>
  );
}
