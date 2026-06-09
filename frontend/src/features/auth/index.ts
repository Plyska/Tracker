export {
  default as authReducer,
  loginSuccess,
  logout,
  initialAuthState,
  AUTH_STATUS,
  selectIsAuthenticated,
  selectCurrentUser,
  selectAuthToken,
  selectIsAdmin,
  type AuthState,
  type AuthStatus,
} from "./model/authSlice";
export {
  loginSchema,
  registerSchema,
  type LoginValues,
  type RegisterValues,
} from "./model/schema";
export {
  mockLogin,
  mockRegister,
  mockOAuth,
  type AuthResult,
  type OAuthProvider,
} from "./lib/mockAuth";
