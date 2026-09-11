import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MailWarning } from "lucide-react";
import { useAppSelector } from "@/app/store/hooks";
import { Button, toast } from "@/shared/ui";
import { selectCurrentUser } from "../model/authSlice";
import { useRequestVerificationMutation } from "../api/authApi";

/**
 * Нагадування підтвердити пошту.
 *
 * Смужка, а не блокування. Рішення свідоме: гейт на непідтверджену адресу коштує конверсії на
 * самому початку, коли людина ще нічого не отримала від продукту. Але й мовчати не можна —
 * **без підтвердженої адреси відновлення пароля не має куди слати лист**, тобто друкарська
 * помилка при реєстрації тихо робить акаунт безповоротним. Саме про це тут і йдеться.
 *
 * Показується лише залогіненим із непідтвердженою поштою; після надсилання ховається, щоб не
 * перетворитись на постійний банер, який перестають бачити.
 */
export function VerifyEmailNotice() {
  const { t } = useTranslation();
  const user = useAppSelector(selectCurrentUser);
  const [requestVerification, { isLoading }] = useRequestVerificationMutation();
  const [sent, setSent] = useState(false);

  if (!user || user.emailVerified || sent) return null;

  const onResend = async () => {
    await requestVerification().unwrap().catch(() => {});
    setSent(true);
    toast.success(t("auth.verify.sent", { email: user.email }));
  };

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-2.5">
        <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span>{t("auth.verify.noticeBody")}</span>
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={isLoading}
        onClick={() => void onResend()}
        className="shrink-0"
      >
        {t("auth.verify.resend")}
      </Button>
    </div>
  );
}
