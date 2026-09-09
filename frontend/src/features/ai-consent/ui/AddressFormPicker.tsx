import { useTranslation } from "react-i18next";
import type { AddressForm } from "@/entities/ai";
import { cn } from "@/shared/lib";

const OPTIONS: AddressForm[] = ["neutral", "masculine", "feminine"];

/**
 * Форма звертання — граматичний рід, а не стать (ADR 0012, рішення Р1 у тон-тестах).
 *
 * Питання поставлене саме як «як до тебе звертатись»: нам потрібен рід дієслова, а не
 * ідентичність, і чесніше сказати це прямо, ніж ставити анкетне «стать». Не при реєстрації —
 * кожне поле там коштує конверсії; місце цьому там, де людина вже вирішує щось про помічника.
 *
 * **Рендериться лише для української.** В англійському звертанні на «you» граматичного роду
 * немає, тож для en-інтерфейсу це контрол, який нічого не робить, — а такі коштують уваги
 * дорожче, ніж дають користі.
 */
export function AddressFormPicker({
  value,
  onChange,
  disabled,
}: {
  value: AddressForm;
  onChange: (v: AddressForm) => void;
  disabled?: boolean;
}) {
  const { t, i18n } = useTranslation();
  if (!i18n.language.startsWith("uk")) return null;

  return (
    <fieldset
      disabled={disabled}
      className={cn("rounded-lg border border-border p-3", disabled && "opacity-50")}
    >
      <legend className="px-1 text-sm font-medium">{t("ai.address.label")}</legend>
      <p className="mb-2 text-xs text-muted-foreground">{t("ai.address.hint")}</p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => (
          <label
            key={option}
            className={cn(
              "cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors",
              "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-card",
              value === option
                ? "border-primary bg-primary/10 font-medium"
                : "border-border hover:bg-accent/50",
              disabled && "cursor-not-allowed",
            )}
          >
            <input
              type="radio"
              name="ai-address-form"
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {t(`ai.address.${option}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
