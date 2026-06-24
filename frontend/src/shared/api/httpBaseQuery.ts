import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type { RefreshResponse } from "./types";

/**
 * Реальний транспорт (backend-фаза) — замінює мок-`baseQuery`. Той самий інтерфейс, тож
 * endpoints в entities/features не змінюються (шов із ADR 0003 / api-contract.md).
 *
 * - `credentials: "include"` — браузер шле/приймає httpOnly refresh-cookie (cross-origin 5173→3000).
 * - `Authorization: Bearer <access>` — токен беремо з `state.auth.token` (структурно, без імпорту
 *   RootState: shared — нижній шар FSD і не залежить від app/features).
 * - На `401` тихо рефрешимо access (`POST /auth/refresh` по cookie), оновлюємо токен і повторюємо
 *   запит один раз; якщо refresh не вдався — диспатчимо logout.
 */

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth?: { token?: string | null } }).auth
      ?.token;
    if (token) headers.set("authorization", `Bearer ${token}`);
    return headers;
  },
});

// Екшени диспатчимо за рядковим типом (`<slice name>/<reducer>`), щоб не імпортувати
// features/auth у shared (заборонений висхідний імпорт FSD). Типи зведені у authSlice.
const TOKEN_REFRESHED = "auth/tokenRefreshed";
const LOGOUT = "auth/logout";

const REFRESH_URL = "/auth/refresh";

// Single-flight: усі паралельні 401 чекають на один refresh-запит (без шторму рефрешів).
let refreshing: Promise<string | null> | null = null;

const requestRefresh = async (
  api: Parameters<typeof rawBaseQuery>[1],
  extraOptions: Parameters<typeof rawBaseQuery>[2],
): Promise<string | null> => {
  const r = await rawBaseQuery({ url: REFRESH_URL, method: "POST" }, api, extraOptions);
  return (r.data as RefreshResponse | undefined)?.accessToken ?? null;
};

export const httpBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  const url = typeof args === "string" ? args : args.url;
  if (result.error?.status === 401 && url !== REFRESH_URL) {
    refreshing ??= requestRefresh(api, extraOptions);
    const newToken = await refreshing;
    refreshing = null;

    if (newToken) {
      api.dispatch({ type: TOKEN_REFRESHED, payload: newToken });
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch({ type: LOGOUT });
    }
  }

  return result;
};
