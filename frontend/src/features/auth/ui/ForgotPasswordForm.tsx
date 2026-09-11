import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { Button, Field, Input } from "@/shared/ui";
import { paths } from "@/shared/config/paths";
import { forgotPasswordSchema, type ForgotPasswordValues } from "../model/schema";
import { useForgotPasswordMutation } from "../api/authApi";

/**
 * «Забув пароль» — запит листа.
 *
 * Успіх показуємо **однаково** незалежно від того, чи існує адреса: сервер навмисно віддає 204 в
 * обох випадках, і UI не має права це розрізняти. Інакше форма стає перевіркою «чи зареєстрований
 * тут такий-то» — готовим списком для фішингу саме серед тих, хто вже нам довіряє.
 *
 * З тієї ж причини мовчимо й про збій надсилання: він іде в лог сервера, а не в інтерфейс.
 */
export function ForgotPasswordForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [forgotPassword] = useForgotPasswordMutation();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    // `.catch` навмисно порожній: єдина помилка, яку тут видно, — мережева, і про неї вже
    // повідомляє errorToastMiddleware. Решту сервер приховує за 204.
    await forgotPassword(values).unwrap().catch(() => {});
    setSent(true);
  });

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <MailCheck className="mx-auto h-10 w-10 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold">{t("auth.forgot.sentTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("auth.forgot.sentBody", { email: getValues("email") })}
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => void navigate(paths.login)}
        >
          {t("auth.forgot.backToLogin")}
        </Button>
      </div>
    );
  }

  const emailError = errors.email?.message;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("auth.forgot.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.forgot.body")}</p>
      </div>

      <Field htmlFor="forgot-email" label={t("auth.email")} error={emailError && t(emailError)}>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder={t("auth.emailPlaceholder")}
          aria-invalid={!!emailError}
          {...register("email")}
        />
      </Field>

      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full text-base">
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {t("auth.forgot.cta")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link to={paths.login} className="font-medium text-primary hover:underline">
          {t("auth.forgot.backToLogin")}
        </Link>
      </p>
    </form>
  );
}
