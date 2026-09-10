import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib";

/**
 * Бейдж «Beta» на поверхнях помічника (ADR 0012, план §3.6).
 *
 * Це не прикраса: поки ми на безкоштовному тирі, дані йдуть провайдеру на вдосконалення
 * моделей. Бейдж — постійне нагадування про це поруч із самою фічею. Прибирається разом із
 * переходом на платний тир.
 */
export function BetaBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary",
        className,
      )}
      title={t("ai.betaHint")}
    >
      {t("ai.beta")}
    </span>
  );
}
