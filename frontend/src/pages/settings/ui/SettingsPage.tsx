import { type CSSProperties, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { AccentPicker } from "@/features/accent";
import { ProfileForm } from "@/features/auth";
import { LangSwitcher } from "@/features/locale";
import { HabitTrash } from "@/features/manage-habits";
import { ThemeToggle } from "@/features/theme";
import { TableLayoutSwitcher, toggleStatWidget } from "@/features/ui-prefs";
import {
  STAT_METRICS,
  STAT_WIDGETS,
  type StatWidgetMeta,
} from "@/widgets/statistics";
import { AnimatedText, TiltCard, Tabs, type TabItem } from "@/shared/ui";
import { cn } from "@/shared/lib";

/** Той самий glow-фон, що на AuthLayout: зсувається залежно від активного таба. */
const GRADIENT = [
  "radial-gradient(75% 65% at var(--glow-x) 0%, color-mix(in srgb, var(--primary) 32%, transparent), transparent 70%)",
  "radial-gradient(70% 70% at 100% 100%, color-mix(in srgb, var(--primary) 24%, transparent), transparent 65%)",
  "radial-gradient(70% 70% at 0% 100%, color-mix(in srgb, var(--primary) 20%, transparent), transparent 65%)",
].join(", ");

function SettingsPage() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dispatch = useAppDispatch();
  const hiddenStatWidgets = useAppSelector((s) => s.uiPrefs.hiddenStatWidgets);
  const [tab, setTab] = useState("app");
  // Поки відкрито дропдаун мови — тримаємо картку збільшеною (курсор іде на портальоване меню).
  const [langOpen, setLangOpen] = useState(false);

  const tabs: TabItem[] = [
    { value: "app", label: t("settings.tabs.app") },
    { value: "profile", label: t("settings.tabs.profile") },
    { value: "trash", label: t("settings.tabs.trash") },
  ];

  // Glow тягнеться до активного таба: рівномірно від лівого краю до правого за індексом таба.
  const activeIndex = Math.max(
    0,
    tabs.findIndex((x) => x.value === tab),
  );
  const glowX = `${15 + (activeIndex / (tabs.length - 1)) * 70}%`;

  // Плитки-тумблери видимості (стиль як Accent/Table layout): підсвічені = видимі, приглушені = приховані.
  const renderWidgetTiles = (items: StatWidgetMeta[]) => (
    // Мобільний — 1 колонка (плитки на всю ширину → назви не обрізаються); від sm — 3 колонки.
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map(({ key, labelKey, icon: Icon }) => {
        const visible = !hiddenStatWidgets.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => dispatch(toggleStatWidget(key))}
            aria-pressed={visible}
            className={cn(
              "relative flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm font-medium",
              "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              visible
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border text-muted-foreground opacity-70 hover:opacity-100 hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{t(labelKey)}</span>
            {visible && <Check className="h-4 w-4 shrink-0 text-primary" />}
          </button>
        );
      })}
    </div>
  );

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
          hoverScale={1.05}
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
                  <TiltCard maxTilt={0} hoverScale={1.04} className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        <AnimatedText>{t("settings.theme.title")}</AnimatedText>
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        <AnimatedText>
                          {t("settings.theme.description")}
                        </AnimatedText>
                      </p>
                    </div>
                    <ThemeToggle />
                  </TiltCard>

                  <TiltCard maxTilt={0} hoverScale={1.04}>
                    <AccentPicker />
                  </TiltCard>

                  <TiltCard
                    maxTilt={0}
                    hoverScale={1.04}
                    active={langOpen}
                    className="flex items-center justify-between gap-4"
                  >
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
                    <LangSwitcher onOpenChange={setLangOpen} />
                  </TiltCard>

                  <TiltCard maxTilt={0} hoverScale={1.04}>
                    <TableLayoutSwitcher />
                  </TiltCard>

                  <TiltCard maxTilt={0} hoverScale={1.04}>
                    <div>
                      <h3 className="text-lg font-semibold">
                        <AnimatedText>
                          {t("settings.statWidgets.title")}
                        </AnimatedText>
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        <AnimatedText>
                          {t("settings.statWidgets.description")}
                        </AnimatedText>
                      </p>
                    </div>
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t("settings.statWidgets.metricsGroup")}
                        </p>
                        {renderWidgetTiles(STAT_METRICS)}
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t("settings.statWidgets.widgetsGroup")}
                        </p>
                        {renderWidgetTiles(STAT_WIDGETS)}
                      </div>
                    </div>
                  </TiltCard>
                </div>
              ) : tab === "profile" ? (
                // Налаштування юзера.
                <TiltCard maxTilt={0} hoverScale={1.04}>
                  <ProfileForm />
                </TiltCard>
              ) : (
                // Кошик видалених навичок.
                <TiltCard maxTilt={0} hoverScale={1.04}>
                  <HabitTrash />
                </TiltCard>
              )}
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
    </section>
  );
}

export default SettingsPage;
