import { isRejectedWithValue, type Middleware } from "@reduxjs/toolkit";
import i18n from "@/shared/config/i18n";
import { toast } from "@/shared/ui";

/**
 * Централізована поверхня помилок RTK Query: будь-яка відхилена мутація/запит → toast.
 * Покриває fire-and-forget мутації (add/update/delete habit, toggle entry) без обробки на місці.
 *
 * Пропускаємо auth-ендпоінти: login/register/oauth показують inline-помилку у формі,
 * getMe/logout — фонові (невдалий getMe → тихий logout у httpBaseQuery, logout — best-effort).
 */
const SILENT = new Set(["login", "register", "oauth", "getMe", "logout"]);

interface RejectedMeta {
  arg?: { endpointName?: string };
}
interface FetchError {
  data?: { code?: string; message?: string };
}

export const errorToastMiddleware: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const endpoint = (action.meta as RejectedMeta | undefined)?.arg?.endpointName;
    if (!endpoint || !SILENT.has(endpoint)) {
      const code = (action.payload as FetchError | undefined)?.data?.code;
      const key = code ? `errors.${code}` : "errors.generic";
      toast.error(i18n.exists(key) ? i18n.t(key) : i18n.t("errors.generic"));
    }
  }
  return next(action);
};
