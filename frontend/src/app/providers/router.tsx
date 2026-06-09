import { createBrowserRouter, Navigate } from "react-router-dom";
import { paths } from "@/shared/config/paths";
import { RequireAuth, RedirectIfAuth } from "@/features/auth";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { MainLayout } from "@/app/layouts/MainLayout";
import { LoginPage } from "@/pages/login";
import { RegisterPage } from "@/pages/register";
import { DashboardPage } from "@/pages/dashboard";
import { StatisticsPage } from "@/pages/statistics";
import { SettingsPage } from "@/pages/settings";

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
            element: <StatisticsPage />,
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
    path: "*",
    element: <Navigate to={paths.dashboard} replace />,
  },
]);
