import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMatches } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ThemeToggle } from "@/features/theme";
import { MoodMenu } from "@/features/log-mood";
import { UserMenu } from "@/features/auth";
import { IconButton } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import type { HeaderProps } from "../model/types";

/** Заголовок поточної сторінки беремо з `handle.titleKey` найглибшого роуту. */
function usePageTitle(): string | null {
  const { t } = useTranslation();
  const matches = useMatches();
  let titleKey: string | undefined;
  for (const m of matches) {
    const handle = m.handle as { titleKey?: string } | null;
    if (handle?.titleKey) titleKey = handle.titleKey;
  }
  return titleKey ? t(titleKey) : null;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { t } = useTranslation();
  const title = usePageTitle();
  const reduceMotion = useReducedMotion();

  return (
    <header
      className={cn(
        "flex h-16 items-center gap-4 px-4 sm:px-6",
        "border-b border-border bg-card text-card-foreground",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <IconButton
          variant="outline"
          size="lg"
          onClick={onMenuClick}
          aria-label={t("sidebar.toggle")}
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
        </IconButton>

        <AnimatePresence mode="wait" initial={false}>
          {title && (
            <motion.h1
              key={title}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="truncate text-lg font-semibold tracking-tight sm:text-xl"
            >
              {title}
            </motion.h1>
          )}
        </AnimatePresence>
      </div>

      {/* Центральна зона: настрій по центру хедера (ліва й права зони — flex-1, рівні). */}
      <div className="flex shrink-0 items-center justify-center">
        <MoodMenu />
      </div>

      <div className="flex flex-1 items-center justify-end gap-4 sm:gap-5">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

export default Header;
