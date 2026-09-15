import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CircleCheck, Loader2, MailCheck } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { Button, Field, Input } from "@/shared/ui";
import { paths } from "@/shared/config/paths";
import { verifyEmailSchema, type VerifyEmailValues } from "../model/schema";
import { useRequestVerificationMutation, useVerifyEmailMutation } from "../api/authApi";
import { selectCurrentUser, selectIsAuthenticated, userLoaded } from "../model/authSlice";

/** Пауза між листами: захищає чужу скриньку від залпу і нашу квоту — від нетерплячих кліків. */
const RESEND_COOLDOWN_SEC = 60;

/** Стан, з яким на сторінку заходять інші екрани. */
export interface VerifyEmailNavState {
  /** Реєстрація вже надіслала код — не слати ще один, лише витримати паузу. */
  justSent?: boolean;
  /** Прийшли з нагадування: код або протух, або його не бачили — шлемо одразу. */
  resend?: boolean;
  /** Куди людина йшла до того, як опинилась на реєстрації. Порожньо — на дашборд. */
  from?: string;
}

/**
 * Підтвердження пошти **кодом із листа**.
 *
 * Чому код, а не посилання: пошту підтверджують одразу після реєстрації, і лист здебільшого
 * читають на телефоні, тоді як реєструвались на ноутбуці. Посилання в цьому сценарії відкриває
 * застосунок «не там», без сесії; код людина переносить очима й лишається там, де почала.
 *
 * Звідси й вимога сервера: код перевіряється **в межах своєї сесії** (`requireAuth`), бо 6 цифр
 * без прив'язки до акаунта перебиралися б проти всієї бази. Після реєстрації сесія вже є, тож
 * додаткового кроку це не створює — а от анонімного гостя треба спершу відправити на вхід.
 */
export function VerifyEmailForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { state } = useLocation() as { state: VerifyEmailNavState | null };
  const next = state?.from ?? paths.dashboard;
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);
  const [verifyEmail] = useVerifyEmailMutation();
  const [requestVerification] = useRequestVerificationMutation();

  const [done, setDone] = useState(false);
  // `null` — код ще не слали в цьому візиті: кнопка тоді називається «надіслати», а не «ще раз».
  const [cooldown, setCooldown] = useState<number | null>(
    state?.justSent || state?.resend ? RESEND_COOLDOWN_SEC : null,
  );

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<VerifyEmailValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { code: "" },
  });

  // `useWatch`, а не `watch()`: та сама ідіома, що в HabitDialog/TaskDialog. `watch()` повертає
  // функцію, яку React Compiler не вміє мемоїзувати, і через неї пропускає весь компонент.
  const code = useWatch({ control, name: "code" });

  // Зворотний відлік до наступного листа. Один інтервал на весь цикл, зупиняється на нулі.
  useEffect(() => {
    if (cooldown === null || cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s === null || s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Прийшли з нагадування — надсилаємо код одразу, щоб людина не шукала кнопку. Рівно один раз:
  // без цієї сітки React у StrictMode надіслав би два листи.
  const autoSent = useRef(false);
  useEffect(() => {
    if (!state?.resend || autoSent.current || !isAuthenticated) return;
    autoSent.current = true;
    void requestVerification().unwrap().catch(() => {});
  }, [state?.resend, isAuthenticated, requestVerification]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await verifyEmail({ code: values.code }).unwrap();
      setDone(true);
      // Користувач у сторі персиститься, тож без цього рядка застосунок у цій самій вкладці ще
      // довго вважав би пошту непідтвердженою — і показував нагадування вже після того, як
      // людина все зробила.
      if (user) dispatch(userLoaded({ ...user, emailVerified: true }));
    } catch {
      // Сервер навмисно не розрізняє «не збігся / протух / згорів»: різні тексти підказували б
      // тому, хто перебирає. Поле чистимо — з нього все одно треба починати заново.
      setValue("code", "");
      setError("root", { message: t("auth.verify.invalid") });
    }
  });

  // Автосабміт на шостій цифрі: код завжди однакової довжини, тож окреме натискання «підтвердити»
  // — зайвий крок. Заразом ловить вставку коду з листа цілим рядком.
  useEffect(() => {
    if (code.length === 6 && !isSubmitting) void onSubmit();
    // `onSubmit` перестворюється щорендеру — у залежностях він зациклив би ефект.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, isSubmitting]);

  const onResend = async () => {
    setCooldown(RESEND_COOLDOWN_SEC);
    clearErrors("root");
    setValue("code", "");
    await requestVerification().unwrap().catch(() => {});
  };

  // Анонім сюди потрапити може (прямим посиланням чи зі старого листа), але підтвердити — ні:
  // код прив'язаний до сесії. Кажемо це прямо, замість форми, яка гарантовано не спрацює.
  if (!isAuthenticated) {
    return (
      <div className="space-y-4 text-center">
        <MailCheck className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
        <h2 className="text-lg font-semibold">{t("auth.verify.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.verify.loginFirst")}</p>
        <Button className="w-full" onClick={() => void navigate(paths.login)}>
          {t("auth.loginCta")}
        </Button>
      </div>
    );
  }

  if (done || user?.emailVerified) {
    return (
      <div className="space-y-4 text-center">
        <CircleCheck className="mx-auto h-10 w-10 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold">{t("auth.verify.doneTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.verify.doneBody")}</p>
        <Button className="w-full" onClick={() => void navigate(next)}>
          {t("auth.verify.toApp")}
        </Button>
      </div>
    );
  }

  const codeError = errors.code?.message;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1 text-center">
        <MailCheck className="mx-auto mb-2 h-10 w-10 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold">{t("auth.verify.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {cooldown === null
            ? t("auth.verify.notSentYet")
            : t("auth.verify.sentTo", { email: user?.email ?? "" })}
        </p>
      </div>

      <Field htmlFor="verify-code" label={t("auth.verify.codeLabel")} error={codeError && t(codeError)}>
        <Input
          id="verify-code"
          // `one-time-code` — те, за чим iOS і Android пропонують код просто над клавіатурою;
          // `inputMode` відкриває цифрову. Разом це знімає половину ручного введення.
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
          autoFocus
          placeholder="000000"
          aria-invalid={!!codeError || !!errors.root}
          className="text-center font-mono text-2xl tracking-[0.4em]"
          {...register("code", {
            // Чистимо все, крім цифр, просто в onChange: люди вставляють код із пробілами й
            // дефісами, і це не привід показувати помилку.
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
              setValue("code", digits);
              if (errors.root) clearErrors("root");
            },
          })}
        />
      </Field>

      {errors.root && (
        <p className="text-sm text-destructive" role="alert">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full text-base">
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {t("auth.verify.cta")}
      </Button>

      <div className="flex flex-col items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => void onResend()}
          disabled={cooldown !== null && cooldown > 0}
          className="font-medium text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        >
          {cooldown !== null && cooldown > 0
            ? t("auth.verify.resendIn", { seconds: cooldown })
            : t(cooldown === null ? "auth.verify.send" : "auth.verify.resend")}
        </button>
        {/* Вихід без підтвердження навмисно лишається: гейт на непідтверджену адресу коштує
            конверсії саме там, де людина ще нічого від продукту не отримала. Нагадування
            чекатиме в Налаштуваннях. */}
        <Link to={next} className="text-muted-foreground hover:text-foreground">
          {t("auth.verify.later")}
        </Link>
      </div>
    </form>
  );
}
