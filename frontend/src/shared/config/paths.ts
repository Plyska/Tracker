export const paths = {
  login: "/auth/login",
  register: "/auth/register",
  forgotPassword: "/auth/forgot-password",
  // Ці двоє — поза зоною `RedirectIfAuth`: людина приходить із листа, і посилання мусить
  // спрацювати незалежно від того, залогінена вона зараз чи ні.
  resetPassword: "/auth/reset-password",
  verifyEmail: "/verify-email",
  dashboard: "/dashboard",
  planner: "/planner",
  /** Сторінка «Загальної» картки (задачі без дати). */
  plannerGeneral: "/planner/general",
  /** Сторінка конкретного дня. `date` — ISO 'YYYY-MM-DD'. */
  plannerDay: (date: string) => `/planner/${date}`,
  statistics: "/statistics",
  diary: "/diary",
  assistant: "/assistant",
  /** Розмова з помічником. Окремий роут, бо в чата власний повноекранний layout: список
   *  скролиться, поле вводу закріплене внизу — під стосом карток це не живе. */
  assistantChat: "/assistant/chat",
  settings: "/settings",
  /**
   * Юридичні документи — статика лендінгу (окремий Vite-entry), не роути SPA: посилання на них —
   * звичайний `<a href>`, повна навігація. Мова — з поточної мови застосунку.
   */
  legal: (doc: "privacy" | "terms", locale: string) => `${locale.startsWith("uk") ? "/uk" : ""}/${doc}`,
} as const;
