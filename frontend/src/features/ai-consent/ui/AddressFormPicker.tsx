import { useTranslation } from "react-i18next";
import type { AddressForm } from "@/entities/ai";
import { cn } from "@/shared/lib";
import { addressFormNeeded } from "../lib/addressForm";

const OPTIONS: AddressForm[] = ["masculine", "feminine"];

/**
 * Форма звертання — граматичний рід, а не стать (ADR 0012, рішення Р1 у тон-тестах).
 *
 * Питання поставлене саме як «як до тебе звертатись»: нам потрібен рід дієслова, а не
 * ідентичність, і чесніше сказати це прямо, ніж ставити анкетне «стать». Не при реєстрації —
 * кожне поле там коштує конверсії; місце цьому там, де людина вже вирішує щось про помічника.
 *
 * **Рендериться лише для української.** В англійському звертанні на «you» граматичного роду
 * немає, тож для en-інтерфейсу це контрол, який нічого не робить, — а такі коштують уваги
 * дорожче, ніж дають користі. Наслідок: хто вмикав помічника англійською, лишається з `null`,
 * і промпт для нього обходиться без роду (`unspecified` на сервері).
 *
 * Варіантів два. Третій — «без роду» — прибрано не з міркувань стилю: заборонна інструкція
 * моделлю не виконувалась, і в кризовій відповіді чату рід прориватися 3 рази з 3.
 */
export function AddressFormPicker({
  value,
  onChange,
  disabled,
}: {
  value: AddressForm | null;
  onChange: (v: AddressForm) => void;
  disabled?: boolean;
}) {
  const { t, i18n } = useTranslation();
  if (!addressFormNeeded(i18n.language)) return null;

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
              // `font-medium` — у БАЗІ, а не в обраному стані. Поки він був лише на обраному,
              // вибір змінював насиченість шрифту, текст ширшав, і сусідня кнопка зсувалась.
              // Товщина бордера й кільце фокуса тут ні до чого: перша однакова в обох станах,
              // друге малюється через box-shadow і розкладку не чіпає.
              "cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              // Без `ring-offset`: він домальовує проміжок кольору картки між власним бордером
              // мітки й кільцем, і фокус читається як два бордери різної товщини. Решта
              // застосунку теж без офсету (Input, Tabs, Toolbar) — тримаємось того самого.
              // `focus-within`, а не `focus-visible`: фокус приймає прихований radio ВСЕРЕДИНІ.
              "focus-within:ring-2 focus-within:ring-ring",
              value === option
                ? "border-primary bg-primary/10"
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
