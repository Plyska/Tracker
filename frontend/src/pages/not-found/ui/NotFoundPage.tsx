import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Compass } from "lucide-react";
import { Button } from "@/shared/ui";
import { paths } from "@/shared/config/paths";

/**
 * 404 — catch-all для невідомих маршрутів (раніше тихо редіректило на dashboard).
 * Самодостатня центрована сторінка (без layout): працює і для анонімних, і для залогінених —
 * CTA веде на dashboard, а звідти guard-роути вирішать (анонім → login).
 */
function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="flex flex-col items-center gap-6"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Compass className="h-8 w-8" />
        </span>

        <div className="space-y-2">
          <p className="text-5xl font-bold tracking-tight text-primary">404</p>
          <h1 className="text-xl font-semibold">{t("notFound.title")}</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t("notFound.description")}
          </p>
        </div>

        <Button onClick={() => navigate(paths.dashboard, { replace: true })}>
          {t("notFound.cta")}
        </Button>
      </motion.div>
    </main>
  );
}

export default NotFoundPage;
