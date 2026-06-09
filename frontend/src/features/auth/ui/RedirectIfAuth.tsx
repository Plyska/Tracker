import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/app/store/hooks";
import { paths } from "@/shared/config/paths";
import { selectIsAuthenticated } from "../model/authSlice";

/** Гард для /auth/*: залогінених не пускає на форми входу → на dashboard. */
export function RedirectIfAuth() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate to={paths.dashboard} replace />;
  }

  return <Outlet />;
}
