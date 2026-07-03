import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { UserAvatar } from "@/entities/user";
import type { UpdateProfileRequest } from "@/shared/api";
import { Button, Field, Input, toast } from "@/shared/ui";
import { fileToAvatarDataUrl, ImageProcessingError } from "@/shared/lib";
import { profileSchema, type ProfileValues } from "../model/schema";
import { useUpdateProfileMutation } from "../api/authApi";
import { selectCurrentUser, userLoaded } from "../model/authSlice";

/**
 * Форма профілю (Settings → таб «Профіль»): ім'я + аватар; email read-only (зміна email —
 * окремий флоу з верифікацією). Аватар клієнт стискає до data-URL ([[shared/lib/image]]) —
 * зберігається в БД як рядок. На успіх синхронимо `authSlice` (`userLoaded`).
 */
export function ProfileForm() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const [updateProfile] = useUpdateProfileMutation();

  const initialAvatar = user?.avatarUrl ?? null;
  const [avatar, setAvatar] = useState<string | null>(initialAvatar);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? "" },
  });

  if (!user) return null;

  const avatarChanged = avatar !== initialAvatar;

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // дозволяємо повторний вибір того самого файлу
    if (!file) return;
    setProcessing(true);
    try {
      setAvatar(await fileToAvatarDataUrl(file));
    } catch (err) {
      const kind = err instanceof ImageProcessingError ? err.kind : "decode";
      toast.error(t(`settings.profile.avatarError.${kind}`));
    } finally {
      setProcessing(false);
    }
  };

  const onSubmit = handleSubmit(async ({ name }) => {
    const body: UpdateProfileRequest = { name };
    if (avatarChanged) body.avatarUrl = avatar; // string (встановити) | null (прибрати)
    try {
      const updated = await updateProfile(body).unwrap();
      dispatch(userLoaded(updated));
      reset({ name: updated.name ?? "" });
      setAvatar(updated.avatarUrl ?? null);
      toast.success(t("settings.profile.saved"));
    } catch {
      setError("root", { message: t("settings.profile.error") });
    }
  });

  const nameError = errors.name?.message;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <h3 className="text-lg font-semibold">{t("settings.profile.title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("settings.profile.description")}
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <UserAvatar
          user={{ name: user.name, email: user.email, avatarUrl: avatar ?? undefined }}
          className="size-28 text-4xl"
        />
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={processing}
          >
            {processing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Camera className="size-4" />
            )}
            {t("settings.profile.avatarChange")}
          </Button>
          {avatar && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAvatar(null)}
              disabled={processing}
            >
              <Trash2 className="size-4" />
              {t("settings.profile.avatarRemove")}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("settings.profile.avatarHint")}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickFile}
        />
      </div>

      <Field
        htmlFor="profile-name"
        label={t("settings.profile.name")}
        error={nameError && t(nameError)}
      >
        <Input
          id="profile-name"
          autoComplete="name"
          placeholder={t("settings.profile.namePlaceholder")}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? "profile-name-error" : undefined}
          {...register("name")}
        />
      </Field>

      <Field htmlFor="profile-email" label={t("settings.profile.email")}>
        <Input id="profile-email" type="email" value={user.email} disabled readOnly />
        <p className="mt-1 text-xs text-muted-foreground">
          {t("settings.profile.emailHint")}
        </p>
      </Field>

      {errors.root && (
        <p className="text-sm text-destructive" role="alert">
          {errors.root.message}
        </p>
      )}

      <div className="flex justify-center">
        <Button
          type="submit"
          disabled={isSubmitting || processing || (!isDirty && !avatarChanged)}
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {t("settings.profile.save")}
        </Button>
      </div>
    </form>
  );
}
