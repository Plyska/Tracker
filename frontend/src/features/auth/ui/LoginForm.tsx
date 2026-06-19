import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAppDispatch } from "@/app/store/hooks";
import { Button, Field, Input } from "@/shared/ui";
import { loginSchema, type LoginValues } from "../model/schema";
import { useLoginMutation } from "../api/authApi";
import { useFromPath } from "../lib/useFromPath";
import { loginSuccess } from "../model/authSlice";
import { SocialAuth } from "./SocialAuth";

export function LoginForm() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const from = useFromPath();
  const [login] = useLoginMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { user, token } = await login(values).unwrap();
      dispatch(loginSuccess({ user, token }));
      navigate(from, { replace: true });
    } catch {
      setError("root", { message: t("auth.error") });
    }
  });

  const emailError = errors.email?.message;
  const passwordError = errors.password?.message;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field
        htmlFor="login-email"
        label={t("auth.email")}
        error={emailError && t(emailError)}
      >
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder={t("auth.emailPlaceholder")}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? "login-email-error" : undefined}
          {...register("email")}
        />
      </Field>

      <Field
        htmlFor="login-password"
        label={t("auth.password")}
        error={passwordError && t(passwordError)}
      >
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder={t("auth.passwordPlaceholder")}
          aria-invalid={!!passwordError}
          aria-describedby={passwordError ? "login-password-error" : undefined}
          {...register("password")}
        />
      </Field>

      {errors.root && (
        <p className="text-sm text-destructive" role="alert">
          {errors.root.message}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full text-base"
      >
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {t("auth.loginCta")}
      </Button>

      <SocialAuth />
    </form>
  );
}
