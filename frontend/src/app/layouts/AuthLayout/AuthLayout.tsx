import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, useLocation, useOutlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { paths } from "@/shared/config/paths";
import { Card } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

const tabs = [
  { to: paths.login, key: "auth.login" },
  { to: paths.register, key: "auth.register" },
] as const;

export function AuthLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const outlet = useOutlet();
  const reduceMotion = useReducedMotion();

  // Анімація реальної висоти контейнера (не scale — щоб діти не «вилазили»).
  // Вимірюємо контент і анімуємо height; overflow-hidden ховає форму, що йде.
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    if (contentRef.current) setHeight(contentRef.current.offsetHeight);
  }, [location.pathname]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 text-foreground">
      {/* Фон-градієнт на accent-токені (адаптується до теми й вибраного акценту).
          Кілька радіальних шарів (верх + нижні кути) — покриває все полотно. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(75% 65% at 50% 0%, color-mix(in srgb, var(--primary) 32%, transparent), transparent 70%)",
            "radial-gradient(70% 70% at 100% 100%, color-mix(in srgb, var(--primary) 24%, transparent), transparent 65%)",
            "radial-gradient(70% 70% at 0% 100%, color-mix(in srgb, var(--primary) 20%, transparent), transparent 65%)",
          ].join(", "),
        }}
      />

      <Card className="relative w-full max-w-md p-7 sm:p-8">
        <h1 className="mb-7 text-center text-3xl font-bold">{t("app.name")}</h1>

        {/* Таби з анімованим індикатором (спільний layoutId — pill «перетікає»). */}
        <nav className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
          {tabs.map(({ to, key }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "relative flex-1 rounded-md px-3 py-2 text-center text-sm font-medium",
                  "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="auth-tab-pill"
                      className="absolute inset-0 rounded-md bg-primary shadow-card"
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 420, damping: 34 }
                      }
                    />
                  )}
                  <span className="relative z-10">{t(key)}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Анімований swap Login↔Register. Зовнішній контейнер анімує РЕАЛЬНУ висоту
            (виміряну з contentRef) → плавний морфінг між формами різної висоти без
            scale-спотворення. `-m-1 / p-1` дають запас, щоб overflow-hidden не обрізав
            focus-ring. Усе вимикається під reduce-motion. */}
        <motion.div
          className={reduceMotion ? undefined : "-m-1 overflow-hidden"}
          animate={reduceMotion ? undefined : { height }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        >
          <div ref={contentRef} className="relative p-1">
            {/* popLayout: вихідна форма стає absolute → нова одразу задає висоту,
                тож height анімується ОДНОЧАСНО з простим fade in/out форм. */}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {outlet}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </Card>
    </div>
  );
}

export default AuthLayout;
