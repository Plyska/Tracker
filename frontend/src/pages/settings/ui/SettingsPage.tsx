import { type CSSProperties, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AccentPicker } from "@/features/accent";
import { ProfileForm } from "@/features/auth";
import { LangSwitcher } from "@/features/locale";
import { TableLayoutSwitcher } from "@/features/ui-prefs";
import { AnimatedText, Card, Tabs, type TabItem } from "@/shared/ui";

/** Той самий glow-фон, що на AuthLayout: зсувається залежно від активного таба. */
const GRADIENT = [
  "radial-gradient(75% 65% at var(--glow-x) 0%, color-mix(in srgb, var(--primary) 32%, transparent), transparent 70%)",
  "radial-gradient(70% 70% at 100% 100%, color-mix(in srgb, var(--primary) 24%, transparent), transparent 65%)",
  "radial-gradient(70% 70% at 0% 100%, color-mix(in srgb, var(--primary) 20%, transparent), transparent 65%)",
].join(", ");

function SettingsPage() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState("app");

  const tabs: TabItem[] = [
    { value: "app", label: t("settings.tabs.app") },
    { value: "profile", label: t("settings.tabs.profile") },
  ];

  // Glow тягнеться до активного таба (додаток — ліворуч, профіль — праворуч), як login↔register.
  const glowX = tab === "profile" ? "80%" : "20%";

  return (
    <section className="relative isolate flex flex-1 flex-col">
      {/* Glow-фон на всю видиму область сторінки: секція тягнеться на висоту `main`
          (flex-1), а від'ємні відступи компенсують падінги `main` → градієнт дістає країв
          (обрізається вже по краях `main`, не по секції — тому без `overflow-hidden`). */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-4 -top-6 -z-10 sm:-inset-6 sm:-top-8"
        animate={{ "--glow-x": glowX }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }
        }
        style={
          {
            "--glow-x": glowX,
            background: GRADIENT,
          } as CSSProperties
        }
      />

      <div className="mx-auto w-full max-w-2xl">
        <Tabs
          items={tabs}
          value={tab}
          onValueChange={setTab}
          centered
          aria-label={t("settings.tabsLabel")}
        >
          {/* Перехід між панелями: fade + вертикальний зсув. `mode="popLayout"` (як AuthLayout) —
              exit-панель виймається з потоку, тож нова входить одразу; на відміну від `mode="wait"`
              не конфліктує з мутацією піддерева (аватар) під React 19 (insertBefore-краш framer-motion). */}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={tab}
              role="tabpanel"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {tab === "app" ? (
                // Клієнтські налаштування (акцент, мова, орієнтація таблиці).
                <div className="space-y-8">
                  <Card>
                    <AccentPicker />
                  </Card>

                  <Card className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        <AnimatedText>
                          {t("settings.language.title")}
                        </AnimatedText>
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        <AnimatedText>
                          {t("settings.language.description")}
                        </AnimatedText>
                      </p>
                    </div>
                    <LangSwitcher />
                  </Card>

                  <Card>
                    <TableLayoutSwitcher />
                  </Card>
                </div>
              ) : (
                // Налаштування юзера.
                <Card>
                  <ProfileForm />
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
    </section>
  );
}

export default SettingsPage;
