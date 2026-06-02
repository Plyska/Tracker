import { createBrowserRouter, Navigate } from "react-router-dom";
import { paths } from "@/shared/config/paths";
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
    path: "auth",
    element: <AuthLayout />,
    children: [
      { index: true, element: <Navigate to={paths.login} replace /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
    ],
  },
  {
    element: <MainLayout />,
    children: [
      { path: "dashboard", element: <DashboardPage /> },
      { path: "statistics", element: <StatisticsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to={paths.dashboard} replace />,
  },
]);
