import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import * as db from "./mock/db";
import type {
  ApiError,
  CreateHabitRequest,
  LoginRequest,
  OAuthProvider,
  RegisterRequest,
  ToggleEntryRequest,
  UpdateHabitRequest,
} from "./types";

/**
 * Кастомний baseQuery, що віддає мок-дані з in-memory `db` (frontend-first, ADR 0003).
 * Той самий інтерфейс, що й `fetchBaseQuery`, тож backend-фаза міняє лише цей модуль:
 *
 *   baseQuery: fetchBaseQuery({
 *     baseUrl: import.meta.env.VITE_API_URL,
 *     prepareHeaders: (h, { getState }) => { ... Bearer (getState()).auth.token ... },
 *   })
 *
 * Endpoints в entities/features НЕ змінюються. Штучна затримка — щоб обкатати loading-UX
 * (skeleton на сітці галочок, Блок 3).
 */

export interface MockRequest {
  url: string;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  params?: Record<string, string>;
  body?: unknown;
}

const MOCK_DELAY_MS = 400;

const wait = (ms = MOCK_DELAY_MS) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const isApiError = (e: unknown): e is ApiError =>
  typeof e === "object" && e !== null && "code" in e && "message" in e;

export const mockBaseQuery: BaseQueryFn<MockRequest, unknown, ApiError> = async (
  { url, method = "GET", params, body },
  api,
) => {
  await wait();
  // Токен сесії читаємо структурно (без імпорту RootState — shared не залежить від app).
  const token =
    (api.getState() as { auth?: { token?: string | null } }).auth?.token ?? null;

  try {
    const route = `${method} ${url}`;

    // --- Habits ---
    if (route === "GET /habits") return { data: db.listHabits() };
    if (route === "POST /habits")
      return { data: db.createHabit(body as CreateHabitRequest) };

    const habitId = url.match(/^\/habits\/([^/]+)$/)?.[1];
    if (habitId && method === "PATCH")
      return { data: db.patchHabit(habitId, body as UpdateHabitRequest) };
    if (habitId && method === "DELETE") {
      db.deleteHabit(habitId);
      return { data: null };
    }

    // --- Entries ---
    if (route === "GET /entries")
      return { data: db.listEntries(params?.from ?? "", params?.to ?? "") };
    if (route === "PUT /entries")
      return { data: db.putEntry(body as ToggleEntryRequest) };

    // --- Auth ---
    if (route === "POST /auth/login")
      return { data: db.login(body as LoginRequest) };
    if (route === "POST /auth/register")
      return { data: db.register(body as RegisterRequest) };
    if (route === "GET /auth/me") return { data: db.me(token) };

    const provider = url.match(/^\/auth\/oauth\/([^/]+)$/)?.[1];
    if (provider && method === "POST")
      return { data: db.oauth(provider as OAuthProvider) };

    return { error: { code: "NOT_FOUND", message: `No mock route: ${route}` } };
  } catch (e) {
    if (isApiError(e)) return { error: e };
    return { error: { code: "INTERNAL", message: "Mock server error" } };
  }
};
