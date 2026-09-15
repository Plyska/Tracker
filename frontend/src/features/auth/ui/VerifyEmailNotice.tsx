import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { MailWarning } from "lucide-react";
import { useAppSelector } from "@/app/store/hooks";
import { Button } from "@/shared/ui";
import { paths } from "@/shared/config/paths";
import { selectCurrentUser } from "../model/authSlice";
import type { VerifyEmailNavState } from "./VerifyEmailForm";

/**
 * Нагадування підтвердити пошту.
 *
 * Смужка, а не блокування. Рішення свідоме: гейт на непідтверджену адресу коштує конверсії на
 * самому початку, коли людина ще нічого не отримала від продукту. Але й мовчати не можна —
 * **без підтвердженої адреси відновлення пароля не має куди слати лист**, тобто друкарська
 * помилка при реєстрації тихо робить акаунт безповоротним. Саме про це тут і йдеться.
 *
 * Веде на сторінку введення коду, а не надсилає лист на місці: код усе одно нема куди ввести
 * в межах цієї смужки, тож лист «у нікуди» лише спалив би спробу й заплутав.
 */
export function VerifyEmailNotice() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAppSelector(selectCurrentUser);

  if (!user || user.emailVerified) return null;

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
        onClick={() =>
          void navigate(paths.verifyEmail, {
            // Код міг протухнути ще тиждень тому — сторінка надішле свіжий одразу на вході.
            state: { resend: true } satisfies VerifyEmailNavState,
          })
        }
        className="shrink-0"
      >
        {t("auth.verify.confirmCta")}
      </Button>
    </div>
  );
}
