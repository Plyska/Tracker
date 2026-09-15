import { useState } from "react";
import { AlertDialog } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useAppDispatch } from "@/app/store/hooks";
import { Button, Field, Input, toast } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { deleteAccountSchema, type DeleteAccountValues } from "../model/schema";
import { useDeleteAccountMutation } from "../api/authApi";
import { logout } from "../model/authSlice";

/**
 * Видалення акаунта (Settings → Профіль) — право на стирання (GDPR ст. 17).
 *
 * Це найнезворотніша дія в продукті, тому вона навмисно **незручна рівно настільки, скільки треба**:
 * окрема картка внизу, окремий діалог, і пароль у ньому. Пароль — не ритуал: чужа рука на
 * відкритій вкладці має все, крім нього. Але жодних «введіть DELETE великими літерами» —
 * людина, яка вирішила піти, не має почуватися, ніби її утримують.
 *
 * Успіх веде на **лендінг**, не на сторінку входу: входити вже нікуди, і форма логіну після
 * видалення читалась би як «щось пішло не так». Це повна навігація (лендінг — окремий entry).
 */
export function DeleteAccountCard() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [deleteAccount] = useDeleteAccountMutation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DeleteAccountValues>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { password: "" },
  });

  const close = (next: boolean) => {
    if (!next) reset();
    setOpen(next);
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await deleteAccount({ password: values.password }).unwrap();
      toast.success(t("auth.deleteAccount.done"));
      // Локальний стан чистимо до навігації: інакше персист встигне записати «залогінений».
      dispatch(logout());
      window.location.assign("/");
    } catch {
      setError("password", { message: "auth.deleteAccount.wrongPassword" });
    }
  });

  // Та сама анімація, що в решті діалогів (fade overlay + scale-pop); центрування — на Motion.
  const content = reduceMotion
    ? {
        initial: { opacity: 0, x: "-50%", y: "-50%" },
        animate: { opacity: 1, x: "-50%", y: "-50%" },
        exit: { opacity: 0, x: "-50%", y: "-50%" },
      }
    : {
        initial: { opacity: 0, scale: 0.96, x: "-50%", y: "-50%" },
        animate: { opacity: 1, scale: 1, x: "-50%", y: "-50%" },
        exit: { opacity: 0, scale: 0.96, x: "-50%", y: "-50%" },
      };

  const passwordError = errors.password?.message;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{t("auth.deleteAccount.title")}</h3>
        <p className="text-sm text-muted-foreground">{t("auth.deleteAccount.body")}</p>
      </div>

      <AlertDialog.Root open={open} onOpenChange={close}>
        <AlertDialog.Trigger asChild>
          <Button
            variant="outline"
            className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
          >
            {t("auth.deleteAccount.cta")}
          </Button>
        </AlertDialog.Trigger>

        <AnimatePresence>
          {open && (
            <AlertDialog.Portal forceMount>
              <AlertDialog.Overlay asChild forceMount>
                <motion.div
                  className="fixed inset-0 z-50 bg-black/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.32, ease: "easeOut" }}
                />
              </AlertDialog.Overlay>
              <AlertDialog.Content asChild forceMount>
                <motion.div
                  className={cn(
                    "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm",
                    "rounded-xl border border-border bg-card p-6 text-card-foreground shadow-card",
                  )}
                  initial={content.initial}
                  animate={content.animate}
                  exit={content.exit}
                  transition={{ duration: 0.32, ease: "easeOut" }}
                >
                  <form onSubmit={onSubmit} noValidate className="space-y-4">
                    <div className="space-y-2">
                      <AlertDialog.Title className="text-lg font-semibold">
                        {t("auth.deleteAccount.confirmTitle")}
                      </AlertDialog.Title>
                      <AlertDialog.Description className="text-sm text-muted-foreground">
                        {t("auth.deleteAccount.confirmBody")}
                      </AlertDialog.Description>
                    </div>

                    <Field
                      htmlFor="delete-account-password"
                      label={t("auth.deleteAccount.password")}
                      error={passwordError && t(passwordError)}
                    >
                      <Input
                        id="delete-account-password"
                        type="password"
                        autoComplete="current-password"
                        autoFocus
                        aria-invalid={!!passwordError}
                        {...register("password")}
                      />
                    </Field>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <AlertDialog.Cancel asChild>
                        <Button type="button" variant="outline">
                          {t("common.cancel")}
                        </Button>
                      </AlertDialog.Cancel>
                      {/* Не AlertDialog.Action: він закриває діалог одразу по кліку, а нам треба
                          дочекатись відповіді сервера й показати помилку пароля на місці. */}
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                        {t("auth.deleteAccount.confirmCta")}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          )}
        </AnimatePresence>
      </AlertDialog.Root>
    </div>
  );
}
