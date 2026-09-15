import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAppDispatch } from "@/app/store/hooks";
import { Button, Field, Input } from "@/shared/ui";
import { paths } from "@/shared/config/paths";
import { registerSchema, type RegisterValues } from "../model/schema";
import { useRegisterMutation } from "../api/authApi";
import { useFromPath } from "../lib/useFromPath";
import { loginSuccess } from "../model/authSlice";
import { SocialAuth } from "./SocialAuth";
import type { VerifyEmailNavState } from "./VerifyEmailForm";

export function RegisterForm() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const from = useFromPath();
  const [registerUser] = useRegisterMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { name, email, password } = values;
      const { user } = await registerUser({
        name,
        email,
        password,
        // Мова, якою людина щойно заповнила цю форму. Сервер збереже її в налаштування одразу
        // при створенні акаунта — інакше перший лист (код підтвердження) пішов би англійською
        // навіть тому, хто весь час бачив український інтерфейс.
        locale: i18n.language,
      }).unwrap();
      dispatch(loginSuccess({ user }));
      // Одразу просимо код: лист із ним сервер уже надіслав у відповідь на реєстрацію. Це той
      // єдиний момент, коли людина точно біля своєї скриньки й розуміє, звідки лист, — далі
      // підтвердження відкладають назавжди, а непідтверджена адреса тихо робить акаунт
      // безповоротним (відновлювати пароль нема куди). Крок необов'язковий: на сторінці є «пізніше».
      navigate(paths.verifyEmail, {
        replace: true,
        // `from` несемо далі: якщо людина йшла на конкретну сторінку й лише через це потрапила
        // на реєстрацію, підтвердження не має з'їсти її початковий намір.
        state: { justSent: true, from } satisfies VerifyEmailNavState,
      });
    } catch {
      setError("root", { message: t("auth.error") });
    }
  });

  const nameError = errors.name?.message;
  const emailError = errors.email?.message;
  const passwordError = errors.password?.message;
  const confirmError = errors.confirmPassword?.message;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field
        htmlFor="register-name"
        label={t("auth.name")}
        error={nameError && t(nameError)}
      >
        <Input
          id="register-name"
          autoComplete="name"
          placeholder={t("auth.namePlaceholder")}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? "register-name-error" : undefined}
          {...register("name")}
        />
      </Field>

      <Field
        htmlFor="register-email"
        label={t("auth.email")}
        error={emailError && t(emailError)}
      >
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          placeholder={t("auth.emailPlaceholder")}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? "register-email-error" : undefined}
          {...register("email")}
        />
      </Field>

      <Field
        htmlFor="register-password"
        label={t("auth.password")}
        error={passwordError && t(passwordError)}
      >
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          placeholder={t("auth.passwordPlaceholder")}
          aria-invalid={!!passwordError}
          aria-describedby={passwordError ? "register-password-error" : undefined}
          {...register("password")}
        />
      </Field>

      <Field
        htmlFor="register-confirm"
        label={t("auth.confirmPassword")}
        error={confirmError && t(confirmError)}
      >
        <Input
          id="register-confirm"
          type="password"
          autoComplete="new-password"
          placeholder={t("auth.passwordPlaceholder")}
          aria-invalid={!!confirmError}
          aria-describedby={confirmError ? "register-confirm-error" : undefined}
          {...register("confirmPassword")}
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
        {t("auth.registerCta")}
      </Button>

      <SocialAuth />
    </form>
  );
}
