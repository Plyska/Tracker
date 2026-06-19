import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAppDispatch } from "@/app/store/hooks";
import { Button } from "@/shared/ui";
import { useOauthMutation } from "../api/authApi";
import { useFromPath } from "../lib/useFromPath";
import { loginSuccess } from "../model/authSlice";
import { GoogleIcon } from "./GoogleIcon";

export function SocialAuth() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const from = useFromPath();
  const [oauth, { isLoading: loading }] = useOauthMutation();

  const onGoogle = async () => {
    try {
      const { user, token } = await oauth("google").unwrap();
      dispatch(loginSuccess({ user, token }));
      navigate(from, { replace: true });
    } catch {
      // лишаємось на формі; стан помилки соц-входу — у подальшому поліші
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("auth.or")}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onGoogle}
        disabled={loading}
        className="w-full text-base"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GoogleIcon className="size-5" />
        )}
        {t("auth.continueGoogle")}
      </Button>
    </div>
  );
}
