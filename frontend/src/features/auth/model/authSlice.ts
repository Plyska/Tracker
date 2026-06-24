import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/app/store";
import type { User } from "@/entities/user";

/** Єдине джерело істини для значень статусу — звіряємось зі змінною, не з літералом. */
export const AUTH_STATUS = {
  Anonymous: "anonymous",
  Authenticated: "authenticated",
} as const;

export type AuthStatus = (typeof AUTH_STATUS)[keyof typeof AUTH_STATUS];

export type AuthState = {
  /** Явний статус сесії (не виводимо з `user`): місце під майбутні loading/error (Фаза 9). */
  status: AuthStatus;
  user: User | null;
  /** Access-JWT від `authApi`; звідси його бере httpBaseQuery для `Authorization: Bearer`. */
  token: string | null;
};

export const initialAuthState: AuthState = {
  status: AUTH_STATUS.Anonymous,
  user: null,
  token: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState: initialAuthState,
  reducers: {
    // Єдина точка входу для login / register / OAuth (усі мок-флоу диспатчать її).
    loginSuccess: (
      state,
      action: PayloadAction<{ user: User; token: string }>,
    ) => {
      state.status = AUTH_STATUS.Authenticated;
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    /** Оновлення лише access-токена після тихого refresh (reauth у httpBaseQuery). */
    tokenRefreshed: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    logout: () => initialAuthState,
  },
});

export const { loginSuccess, tokenRefreshed, logout } = authSlice.actions;
export default authSlice.reducer;

// Селектори — одна типізована точка істини (читають RequireAuth/Sidebar тощо).
export const selectIsAuthenticated = (s: RootState) =>
  s.auth.status === AUTH_STATUS.Authenticated;
export const selectCurrentUser = (s: RootState) => s.auth.user;
export const selectAuthToken = (s: RootState) => s.auth.token;
export const selectIsAdmin = (s: RootState) => s.auth.user?.role === "admin";
