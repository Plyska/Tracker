import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button, Field, Input, toast } from "@/shared/ui";
import { paths } from "@/shared/config/paths";
import { resetPasswordSchema, type ResetPasswordValues } from "../model/schema";
import { useResetPasswordMutation } from "../api/authApi";

/**
 * Новий пароль за посиланням із листа.
 *
 * Токен береться з URL, а не з форми: людина сюди приходить із пошти, і зайве поле, куди треба
 * щось вставити, — найкоротший шлях кинути все на півдорозі.
 *
 * Після успіху ведемо на вхід, а не логінимо автоматично. Сервер відкликає всі сесії (саме заради
 * цього скидання й роблять), тож «зайти автоматично» довелося б імітувати — а свіжий вхід новим
 * паролем ще й підтверджує людині, що він справді працює.
 */
export function ResetPasswordForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");
  const [resetPassword] = useResetPasswordMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // Посилання без токена — не помилка форми, а зламане посилання: показуємо це одразу, а не
  // після того, як людина вигадає й двічі введе новий пароль.
  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <TriangleAlert className="mx-auto h-10 w-10 text-destructive" aria-hidden />
        <h2 className="text-lg font-semibold">{t("auth.reset.invalidTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.reset.invalidBody")}</p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => void navigate(paths.forgotPassword)}
        >
          {t("auth.reset.requestAgain")}
        </Button>
      </div>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await resetPassword({ token, password: values.password }).unwrap();
      toast.success(t("auth.reset.done"));
      void navigate(paths.login, { replace: true });
    } catch {
      // Сервер не розрізняє «немає / протух / уже використаний» — і ми теж не вигадуємо причину.
      setError("root", { message: t("auth.reset.invalidBody") });
    }
  });

  const passwordError = errors.password?.message;
  const confirmError = errors.confirmPassword?.message;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("auth.reset.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.reset.body")}</p>
      </div>

      <Field
        htmlFor="reset-password"
        label={t("auth.reset.newPassword")}
        error={passwordError && t(passwordError)}
      >
        <Input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!passwordError}
          {...register("password")}
        />
      </Field>

      <Field
        htmlFor="reset-confirm"
        label={t("auth.confirmPassword")}
        error={confirmError && t(confirmError)}
      >
        <Input
          id="reset-confirm"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!confirmError}
          {...register("confirmPassword")}
        />
      </Field>

      {errors.root && (
        <p className="text-sm text-destructive" role="alert">
          {errors.root.message}{" "}
          <Link to={paths.forgotPassword} className="font-medium underline">
            {t("auth.reset.requestAgain")}
          </Link>
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full text-base">
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {t("auth.reset.cta")}
      </Button>
    </form>
  );
}
