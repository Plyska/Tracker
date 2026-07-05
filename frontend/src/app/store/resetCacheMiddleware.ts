import type { Middleware } from "@reduxjs/toolkit";
import { baseApi } from "@/shared/api";

/**
 * Скидає весь кеш RTK Query при зміні сесії. Без цього серверні дані попереднього
 * акаунта лишаються в пам'яті (кеш session-only, не персиститься) і «протікають»
 * у наступну сесію при in-app logout→login без перезавантаження сторінки.
 *
 * Ловимо обидва напрямки і всі шляхи входу/виходу однією точкою:
 * - `auth/logout` — меню-логаут (UserMenu) та тихий logout при провалі refresh (httpBaseQuery);
 * - `auth/loginSuccess` — login / register / OAuth (страхує, якщо logout колись пропущено).
 */
const SESSION_CHANGE = new Set(["auth/logout", "auth/loginSuccess"]);

export const resetCacheMiddleware: Middleware =
  (api) => (next) => (action) => {
    const result = next(action);
    if (
      typeof (action as { type?: unknown }).type === "string" &&
      SESSION_CHANGE.has((action as { type: string }).type)
    ) {
      api.dispatch(baseApi.util.resetApiState());
    }
    return result;
  };
