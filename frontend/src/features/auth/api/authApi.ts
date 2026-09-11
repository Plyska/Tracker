import { baseApi } from "@/shared/api";
import type {
  AuthResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  OAuthProvider,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
  UserDto,
  VerifyEmailRequest,
} from "@/shared/api";
import type { User } from "@/entities/user";

/** DTO → domain: явні `null` контракту → `undefined` доменної моделі. */
const toUser = (dto: UserDto): User => ({
  id: dto.id,
  email: dto.email,
  name: dto.name ?? undefined,
  avatarUrl: dto.avatarUrl ?? undefined,
  plan: dto.plan,
  role: dto.role,
  emailVerified: dto.emailVerified,
});

export interface AuthResult {
  user: User;
}

const toResult = (res: AuthResponse): AuthResult => ({
  user: toUser(res.user),
});

/**
 * Транспорт автентифікації (RTK Query). Власник сесійного стану лишається `authSlice`
 * (status/user + персист) — API лише ходить по мережу. Cookie-флоу (Security-фаза B):
 * токени виставляє бекенд у cookie, у тілі лише `{ user }`.
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<AuthResult, LoginRequest>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      transformResponse: toResult,
    }),
    register: build.mutation<AuthResult, RegisterRequest>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
      transformResponse: toResult,
    }),
    oauth: build.mutation<AuthResult, OAuthProvider>({
      query: (provider) => ({ url: `/auth/oauth/${provider}`, method: "POST" }),
      transformResponse: toResult,
    }),
    // Відкликає refresh-токен на сервері + чистить httpOnly cookie. Локальний стан
    // (`authSlice`) чистить виклик-сайт незалежно від мережевого результату.
    logout: build.mutation<void, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
    }),
    // Шов на майбутнє (рехідрація сесії). UI зараз не викликає — сесію тримає authSlice-персист.
    getMe: build.query<User, void>({
      query: () => ({ url: "/auth/me" }),
      transformResponse: toUser,
      providesTags: [{ type: "Me", id: "CURRENT" }],
    }),
    // Оновлення профілю (наразі ім'я). Повертає свіжий `UserDto`; виклик-сайт синхронить
    // `authSlice` через `userLoaded`. Інвалідує `Me`-кеш (рехідрація сесії підхопить нове ім'я).
    /**
     * «Забув пароль». Відповідь **завжди** 204 — сервер навмисно не каже, чи існує адреса, тож
     * і UI не має чого розрізняти: показуємо «перевір пошту» в будь-якому разі.
     */
    forgotPassword: build.mutation<void, ForgotPasswordRequest>({
      query: (body) => ({ url: "/auth/forgot-password", method: "POST", body }),
    }),
    resetPassword: build.mutation<void, ResetPasswordRequest>({
      query: (body) => ({ url: "/auth/reset-password", method: "POST", body }),
    }),
    verifyEmail: build.mutation<void, VerifyEmailRequest>({
      query: (body) => ({ url: "/auth/verify-email", method: "POST", body }),
      // Статус підтвердження живе в `UserDto`, тож рехідрація сесії має його перечитати.
      invalidatesTags: [{ type: "Me", id: "CURRENT" }],
    }),
    requestVerification: build.mutation<void, void>({
      query: () => ({ url: "/auth/verify-email/request", method: "POST" }),
    }),
    // Після успіху сервер відкликає ВСІ сесії й чистить cookie — виклик-сайт мусить розлогінити
    // локальний стан, інакше застосунок вважатиме себе залогіненим до першого 401.
    changePassword: build.mutation<void, ChangePasswordRequest>({
      query: (body) => ({ url: "/auth/change-password", method: "POST", body }),
    }),
    updateProfile: build.mutation<User, UpdateProfileRequest>({
      query: (body) => ({ url: "/auth/me", method: "PATCH", body }),
      transformResponse: toUser,
      invalidatesTags: [{ type: "Me", id: "CURRENT" }],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useOauthMutation,
  useLogoutMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyEmailMutation,
  useRequestVerificationMutation,
  useChangePasswordMutation,
} = authApi;
