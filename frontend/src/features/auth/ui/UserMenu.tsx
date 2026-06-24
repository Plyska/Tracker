import { useState } from "react";
import { DropdownMenu } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut, Settings } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { UserAvatar } from "@/entities/user";
import { paths } from "@/shared/config/paths";
import { cn } from "@/shared/lib/cn";
import { logout, selectCurrentUser } from "../model/authSlice";
import { useLogoutMutation } from "../api/authApi";

const itemClass = cn(
  "flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
  "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
);

export function UserMenu() {
  const { t } = useTranslation();
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [logoutOnServer] = useLogoutMutation();

  if (!user) return null;

  const onLogout = () => {
    // Відкликаємо сесію на сервері (best-effort), але локальний стан чистимо завжди —
    // навіть якщо запит упав (офлайн/прострочений токен), користувач має вийти.
    void logoutOnServer();
    dispatch(logout());
    navigate(paths.login, { replace: true });
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={t("userMenu.label")}
          className="rounded-full outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <UserAvatar user={user} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal forceMount>
        <AnimatePresence>
          {open && (
            <DropdownMenu.Content asChild forceMount align="end" sideOffset={8}>
              {/* Поява як у HabitRowMenu/HabitDialog: fade + scale-pop від тригера. */}
              <motion.div
                initial={
                  reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }
                }
                animate={
                  reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }
                }
                exit={
                  reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }
                }
                transition={{ duration: 0.16, ease: "easeOut" }}
                style={{
                  transformOrigin:
                    "var(--radix-dropdown-menu-content-transform-origin)",
                }}
                className="z-50 min-w-56 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-card"
              >
                <div className="flex items-center gap-3 px-2 py-2">
                  <UserAvatar user={user} />
                  <div className="min-w-0">
                    {user.name && (
                      <p className="truncate text-sm font-medium">
                        {user.name}
                      </p>
                    )}
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>

                <DropdownMenu.Separator className="my-1 h-px bg-border" />

                <DropdownMenu.Item asChild className={itemClass}>
                  <Link to={paths.settings}>
                    <Settings className="h-4 w-4" />
                    {t("nav.settings")}
                  </Link>
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  onSelect={onLogout}
                  className={cn(
                    itemClass,
                    "text-destructive data-highlighted:text-destructive",
                  )}
                >
                  <LogOut className="h-4 w-4" />
                  {t("userMenu.logout")}
                </DropdownMenu.Item>
              </motion.div>
            </DropdownMenu.Content>
          )}
        </AnimatePresence>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
