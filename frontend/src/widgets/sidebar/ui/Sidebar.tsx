import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";
import { IconButton } from "@/shared/ui";
import { useMediaQuery } from "@/shared/lib/hooks/useMediaQuery";
import type { NavItem, SidebarProps } from "../model/types";

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/statistics", labelKey: "nav.statistics", icon: BarChart3 },
];

const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  labelKey: "nav.settings",
  icon: Settings,
};

const LABEL_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15, delay: 0.08 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export function Sidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isCollapsed = isDesktop && collapsed;

  const renderItem = ({ href, labelKey, icon: Icon }: NavItem) => {
    const label = t(labelKey);
    return (
    <NavLink
      key={href}
      to={href}
      onClick={onClose}
      title={isCollapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-accent hover:text-accent-foreground",
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.span className="whitespace-nowrap" {...LABEL_MOTION}>
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </NavLink>
    );
  };

  return (
    <>
      {open && !isDesktop && (
        <motion.div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <motion.aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col overflow-hidden",
          "border-r border-border bg-card text-card-foreground",
          "md:static md:border-r",
        )}
        initial={false}
        animate={{
          x: isDesktop || open ? 0 : "-100%",
          width: isCollapsed ? 72 : 256,
        }}
        transition={{
          x: { type: "spring", stiffness: 400, damping: 32 },
          width: { type: "tween", duration: 0.2, ease: "easeInOut" },
        }}
        aria-hidden={!isDesktop && !open}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4 md:hidden">
          <h1 className="text-lg font-bold">{t("app.name")}</h1>
          <IconButton size="sm" onClick={onClose} aria-label={t("sidebar.close")}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="hidden h-16 items-center gap-3 border-b border-border px-4 md:flex">
          <IconButton
            size="sm"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            title={isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            className="shrink-0"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </IconButton>
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.h1
                className="whitespace-nowrap text-lg font-bold"
                {...LABEL_MOTION}
              >
                {t("app.name")}
              </motion.h1>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 space-y-1 p-3">{NAV_ITEMS.map(renderItem)}</nav>
        <nav className="space-y-1 px-3 pb-3">{renderItem(SETTINGS_ITEM)}</nav>

        <div className="whitespace-nowrap border-t border-border p-4 text-xs text-muted-foreground">
          <AnimatePresence initial={false} mode="wait">
            <motion.span key={isCollapsed ? "short" : "full"} {...LABEL_MOTION}>
              {isCollapsed ? t("app.versionShort") : t("app.versionFull")}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.aside>
    </>
  );
}
