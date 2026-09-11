import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAppDispatch } from "@/app/store/hooks";
import { Button, Field, Input, toast } from "@/shared/ui";
import { paths } from "@/shared/config/paths";
import { changePasswordSchema, type ChangePasswordValues } from "../model/schema";
import { useChangePasswordMutation } from "../api/authApi";
import { logout } from "../model/authSlice";

/**
 * Зміна пароля залогіненим (Settings → Профіль).
 *
 * Поточний пароль питаємо обовʼязково: без нього будь-хто, хто на хвилину дістався до відкритої
 * вкладки, забирає акаунт назовсім — саме той сценарій, від якого зміна пароля й захищає.
 *
 * Успіх **розлогінює**. Сервер відкликає всі сесії, включно з поточною, тож інакше застосунок
 * лишався б у стані «залогінений» до першого 401 — і людина побачила б випадкову помилку замість
 * зрозумілого «увійди заново».
 */
export function ChangePasswordForm() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [changePassword] = useChangePasswordMutation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }).unwrap();
      reset();
      toast.success(t("auth.changePassword.done"));
      dispatch(logout());
      void navigate(paths.login, { replace: true });
    } catch {
      setError("currentPassword", { message: "auth.changePassword.wrongCurrent" });
    }
  });

  const currentError = errors.currentPassword?.message;
  const newError = errors.newPassword?.message;
  const confirmError = errors.confirmPassword?.message;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{t("auth.changePassword.title")}</h3>
        <p className="text-sm text-muted-foreground">{t("auth.changePassword.body")}</p>
      </div>

      <Field
        htmlFor="current-password"
        label={t("auth.changePassword.current")}
        error={currentError && t(currentError)}
      >
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!currentError}
          {...register("currentPassword")}
        />
      </Field>

      <Field
        htmlFor="new-password"
        label={t("auth.changePassword.new")}
        error={newError && t(newError)}
      >
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!newError}
          {...register("newPassword")}
        />
      </Field>

      <Field
        htmlFor="new-password-confirm"
        label={t("auth.confirmPassword")}
        error={confirmError && t(confirmError)}
      >
        <Input
          id="new-password-confirm"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!confirmError}
          {...register("confirmPassword")}
        />
      </Field>

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {t("auth.changePassword.cta")}
      </Button>
    </form>
  );
}
