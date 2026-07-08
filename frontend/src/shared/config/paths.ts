export const paths = {
  login: "/auth/login",
  register: "/auth/register",
  dashboard: "/dashboard",
  planner: "/planner",
  /** Сторінка «Загальної» картки (задачі без дати). */
  plannerGeneral: "/planner/general",
  /** Сторінка конкретного дня. `date` — ISO 'YYYY-MM-DD'. */
  plannerDay: (date: string) => `/planner/${date}`,
  statistics: "/statistics",
  settings: "/settings",
} as const;
