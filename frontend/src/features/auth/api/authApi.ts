import { baseApi } from "@/shared/api";
import type {
  AuthResponse,
  LoginRequest,
  OAuthProvider,
  RegisterRequest,
  UserDto,
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
});

export interface AuthResult {
  user: User;
  token: string;
}

const toResult = (res: AuthResponse): AuthResult => ({
  user: toUser(res.user),
  token: res.accessToken,
});

/**
 * Транспорт автентифікації (RTK Query). Власник сесійного стану лишається `authSlice`
 * (status/user/token + персист) — API лише ходить по мережу. Backend-фаза: auth стане
 * першим реальним ендпоінтом, тіло мутацій не зміниться (лише baseQuery → HTTP).
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
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useOauthMutation,
  useLogoutMutation,
  useGetMeQuery,
} = authApi;
