import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "@/app/store/hooks";
import { paths } from "@/shared/config/paths";
import { selectIsAuthenticated } from "../model/authSlice";

/** Гард для приватної зони: анонімних → на /auth/login, запамʼятавши `from`. */
export function RequireAuth() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to={paths.login}
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  return <Outlet />;
}
