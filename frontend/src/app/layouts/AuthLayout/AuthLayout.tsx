import { Outlet, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { paths } from "@/shared/config/paths";
import { Card } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

const tabClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex-1 rounded-md px-3 py-2 text-center text-sm font-medium",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring",
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );

export function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <Card className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold">{t("app.name")}</h1>

        <nav className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
          <NavLink to={paths.login} className={tabClass}>
            {t("auth.login")}
          </NavLink>
          <NavLink to={paths.register} className={tabClass}>
            {t("auth.register")}
          </NavLink>
        </nav>

        <Outlet />
      </Card>
    </div>
  );
}

export default AuthLayout;
