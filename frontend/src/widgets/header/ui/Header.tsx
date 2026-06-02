import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/features/theme";
import { IconButton } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import type { HeaderProps } from "../model/types";

export function Header({ onMenuClick }: HeaderProps) {
  const { t } = useTranslation();
  return (
    <header
      className={cn(
        "flex h-16 items-center justify-between px-4 sm:px-6",
        "border-b border-border bg-card text-card-foreground",
      )}
    >
      <IconButton
        variant="outline"
        size="lg"
        onClick={onMenuClick}
        aria-label={t("sidebar.toggle")}
        className="md:hidden"
      >
        <Menu className="h-5 w-5" />
      </IconButton>

      <div className="flex-1" />

      <ThemeToggle />
    </header>
  );
}

export default Header;
