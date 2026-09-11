import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CircleCheck, Loader2, TriangleAlert } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  selectCurrentUser,
  selectIsAuthenticated,
  useVerifyEmailMutation,
  userLoaded,
} from "@/features/auth";
import { Button } from "@/shared/ui";
import { paths } from "@/shared/config/paths";

/**
 * Сторінка за посиланням із листа — підтверджує адресу сама, без кнопки.
 *
 * Людина вже підтвердила намір, натиснувши посилання в листі; ще одна кнопка «підтвердити» тут
 * нічого не додає, крім кроку. Тому єдиний стан, який вона бачить, — результат.
 *
 * Сторінка навмисно **поза** зоною авторизації: підтверджують пошту здебільшого з телефона, де
 * сесії немає. Токен сам себе авторизує.
 */
function VerifyEmailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const [verifyEmail] = useVerifyEmailMutation();
  const [state, setState] = useState<"pending" | "done" | "failed">(token ? "pending" : "failed");

  // Один виклик на монтування. Без цієї сітки React у StrictMode робить два, і другий гарантовано
  // падає: токен одноразовий, тож людина бачила б помилку на успішному підтвердженні.
  const started = useRef(false);
  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    verifyEmail({ token })
      .unwrap()
      .then(() => {
        setState("done");
        // Користувач у сторі персиститься, тож без цього рядка застосунок у цій самій вкладці
        // ще довго вважав би пошту непідтвердженою — і показував нагадування вже після того,
        // як людина все зробила.
        if (user) dispatch(userLoaded({ ...user, emailVerified: true }));
      })
      .catch(() => setState("failed"));
    // Навмисно без `user` у залежностях: ефект має спрацювати один раз на монтування, а не
    // перезапускатись від оновлення профілю. Захист від подвійного виклику — `started`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, verifyEmail]);

  if (state === "pending") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">{t("auth.verify.pending")}</p>
      </div>
    );
  }

  const ok = state === "done";
  return (
    <div className="space-y-4 text-center">
      {ok ? (
        <CircleCheck className="mx-auto h-10 w-10 text-primary" aria-hidden />
      ) : (
        <TriangleAlert className="mx-auto h-10 w-10 text-destructive" aria-hidden />
      )}
      <h2 className="text-lg font-semibold">
        {t(ok ? "auth.verify.doneTitle" : "auth.verify.failedTitle")}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t(ok ? "auth.verify.doneBody" : "auth.verify.failedBody")}
      </p>
      {/* Залогіненого ведемо в застосунок, анонімного — на вхід: інакше половина людей
          упирається в екран, який просить те, що вони щойно зробили. */}
      <Button
        className="w-full"
        onClick={() => void navigate(isAuthenticated ? paths.dashboard : paths.login)}
      >
        {t(isAuthenticated ? "auth.verify.toApp" : "auth.forgot.backToLogin")}
      </Button>
    </div>
  );
}

export default VerifyEmailPage;
