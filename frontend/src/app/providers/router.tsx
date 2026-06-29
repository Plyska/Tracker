import { createBrowserRouter, Navigate } from "react-router-dom";
import { paths } from "@/shared/config/paths";
import { RequireAuth, RedirectIfAuth } from "@/features/auth";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { MainLayout } from "@/app/layouts/MainLayout";
import { LoginPage } from "@/pages/login";
import { RegisterPage } from "@/pages/register";
import { DashboardPage } from "@/pages/dashboard";
import { SettingsPage } from "@/pages/settings";
import { NotFoundPage } from "@/pages/not-found";

export const router = createBrowserRouter([
  {
    index: true,
    element: <Navigate to={paths.dashboard} replace />,
  },
  {
    // Залогінених на /auth/* перекидає на dashboard.
    element: <RedirectIfAuth />,
    children: [
      {
        path: "auth",
        element: <AuthLayout />,
        children: [
          { index: true, element: <Navigate to={paths.login} replace /> },
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
        ],
      },
    ],
  },
  {
    // Приватна зона: анонімних відправляє на /auth/login (з памʼяттю `from`).
    element: <RequireAuth />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: "dashboard",
            element: <DashboardPage />,
            handle: { titleKey: "nav.dashboard" },
          },
          {
            path: "statistics",
            // Ліниво (важкий recharts) — окремий чанк через route-level lazy: у основний
            // бандл не потрапляє, навігація чекає чанк (~97 КБ gzip, швидко).
            lazy: async () => {
              const { StatisticsPage } = await import("@/pages/statistics");
              return { Component: StatisticsPage };
            },
            handle: { titleKey: "nav.statistics" },
          },
          {
            path: "settings",
            element: <SettingsPage />,
            handle: { titleKey: "nav.settings" },
          },
        ],
      },
    ],
  },
  {
    // Невідомий маршрут → 404 (раніше тихо редіректило на dashboard).
    path: "*",
    element: <NotFoundPage />,
  },
]);
