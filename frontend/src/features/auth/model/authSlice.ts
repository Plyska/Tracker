import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/app/store";
import type { User } from "@/entities/user";

/** Єдине джерело істини для значень статусу — звіряємось зі змінною, не з літералом. */
export const AUTH_STATUS = {
  Anonymous: "anonymous",
  Authenticated: "authenticated",
} as const;

export type AuthStatus = (typeof AUTH_STATUS)[keyof typeof AUTH_STATUS];

/**
 * Сесійний стан. Access-токен тут НЕ зберігаємо — він живе у httpOnly cookie (Security-фаза,
 * варіант B): JS його не бачить (анти-XSS). Slice тримає лише статус + профіль для UI.
 */
export type AuthState = {
  /** Явний статус сесії (не виводимо з `user`): місце під майбутні loading/error. */
  status: AuthStatus;
  user: User | null;
};

export const initialAuthState: AuthState = {
  status: AUTH_STATUS.Anonymous,
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState: initialAuthState,
  reducers: {
    // Єдина точка входу для login / register / OAuth. Токени вже у cookie (виставив бекенд).
    loginSuccess: (state, action: PayloadAction<{ user: User }>) => {
      state.status = AUTH_STATUS.Authenticated;
      state.user = action.payload.user;
    },
    /** Свіжий `user` із `GET /auth/me` при рехідрації сесії на буті (SessionProvider). */
    userLoaded: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    logout: () => initialAuthState,
  },
});

export const { loginSuccess, userLoaded, logout } = authSlice.actions;
export default authSlice.reducer;

// Селектори — одна типізована точка істини (читають RequireAuth/Sidebar тощо).
export const selectIsAuthenticated = (s: RootState) =>
  s.auth.status === AUTH_STATUS.Authenticated;
export const selectCurrentUser = (s: RootState) => s.auth.user;
export const selectIsAdmin = (s: RootState) => s.auth.user?.role === "admin";
