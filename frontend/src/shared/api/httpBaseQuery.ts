import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

/**
 * Реальний транспорт (cookie-флоу автентифікації, Security-фаза варіант B).
 *
 * - `credentials: "include"` — браузер шле/приймає httpOnly cookie (access + refresh) cross-origin.
 *   Access-токен у cookie, тож **жодного `Authorization` заголовка** — JS токен не торкається (анти-XSS).
 * - CSRF (double-submit): читаємо `csrf_token` із cookie й дублюємо у заголовок `X-CSRF-Token` на
 *   мутаціях; бекенд звіряє cookie==заголовок (`requireCsrf`).
 * - На `401` тихо рефрешимо сесію (`POST /auth/refresh` по refresh-cookie → нові access/csrf cookie)
 *   і повторюємо запит один раз; якщо refresh не вдався — диспатчимо logout.
 */

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "X-CSRF-Token";

/** Читає значення cookie за іменем (CSRF-токен — навмисно не httpOnly). */
const readCookie = (name: string): string | undefined =>
  document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.slice(name.length + 1);

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL,
  credentials: "include",
  prepareHeaders: (headers) => {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) headers.set(CSRF_HEADER, csrf);
    return headers;
  },
});

// Екшени диспатчимо за рядковим типом, щоб не імпортувати features/auth у shared (FSD).
const LOGOUT = "auth/logout";

const REFRESH_URL = "/auth/refresh";

// Single-flight: усі паралельні 401 чекають на один refresh-запит (без шторму рефрешів).
let refreshing: Promise<boolean> | null = null;

const requestRefresh = async (
  api: Parameters<typeof rawBaseQuery>[1],
  extraOptions: Parameters<typeof rawBaseQuery>[2],
): Promise<boolean> => {
  const r = await rawBaseQuery(
    { url: REFRESH_URL, method: "POST" },
    api,
    extraOptions,
  );
  // Успіх → бекенд оновив access/csrf cookie; токен у тілі не повертається.
  return !r.error;
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
    const ok = await refreshing;
    refreshing = null;

    if (ok) {
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch({ type: LOGOUT });
    }
  }

  return result;
};
