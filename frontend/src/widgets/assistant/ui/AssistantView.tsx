import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useGetAiQuotaQuery,
  useGetReflectionMutation,
  useGetReflectionsQuery,
  useAiPrefs,
} from "@/entities/ai";
import { AiConsentDialog, BetaBadge } from "@/features/ai-consent";
import { CheckinComposer } from "@/features/ai-checkin";
import { type ChatSeed } from "@/features/ai-chat";
import type { ReflectionDto } from "@/shared/api";
import { Button, Card, Skeleton } from "@/shared/ui";
import { paths } from "@/shared/config/paths";
import { formatDateRange, todayISODate } from "@/shared/lib";
import type { Locale } from "@/shared/config/i18n";
import { ReflectionCard } from "./ReflectionCard";
import { InsightCard } from "./InsightCard";

/**
 * Сторінка помічника (ADR 0012, фаза A).
 *
 * Ключове рішення — лист генерується **on-demand при відкритті**, а не фоном: Neon засинає без
 * запитів, і ми свідомо не тримаємо крон у процесі. Користувач прийшов — БД і так прокинулась,
 * тож платимо лише за тих, хто реально зайшов. Повторне відкриття віддає кеш (нуль токенів).
 */
export function AssistantView() {
  const { t, i18n } = useTranslation();
  const reduce = useReducedMotion();
  const today = todayISODate();
  const locale = (i18n.language.startsWith("uk") ? "uk" : "en") as Locale;

  const { enabled, isLoading: prefsLoading } = useAiPrefs();
  const [consentOpen, setConsentOpen] = useState(false);
  const [reflection, setReflection] = useState<ReflectionDto | null>(null);

  // Розмова живе на власному роуті (`/assistant/chat`), тож «обговорити» — це навігація із
  // зачіпкою, а не перемикання стану сторінки. Плюс до повноекранного layout це дає безкоштовно
  // правильне «назад» і посилання, яке можна відкрити напряму.
  const navigate = useNavigate();
  const openChat = (seed: ChatSeed) => void navigate(paths.assistantChat, { state: { seed } });

  const [generate, { isLoading: generating, error }] = useGetReflectionMutation();
  const { data: quota } = useGetAiQuotaQuery({ today }, { skip: !enabled });
  const { data: history } = useGetReflectionsQuery({ period: "week" }, { skip: !enabled });

  // Автогенерація рівно один раз на монтування, коли помічник увімкнено. `requested` захищає
  // від повторного виклику на ре-рендерах (лист із кешу дешевий, але зайвий запит — шум).
  const requested = useRef(false);
  useEffect(() => {
    if (!enabled || requested.current) return;
    requested.current = true;
    generate({ period: "week", today, locale })
      .unwrap()
      .then(setReflection)
      .catch(() => {
        /* помилку показує errorToastMiddleware; нижче — власний порожній стан */
      });
  }, [enabled, generate, today, locale]);

  if (prefsLoading) return <Skeleton className="h-64 rounded-xl" />;

  // ── До згоди: інтро, а не тумблер (рішення про передачу даних потребує пояснення) ──────
  if (!enabled) {
    return (
      <>
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <Sparkles className="h-8 w-8 text-primary" aria-hidden />
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{t("ai.intro.title")}</h2>
            <BetaBadge />
          </div>
          <p className="max-w-md text-sm text-muted-foreground">{t("ai.intro.body")}</p>
          <Button onClick={() => setConsentOpen(true)} className="mt-2">
            {t("ai.intro.enable")}
          </Button>
        </Card>
        <AiConsentDialog
          open={consentOpen}
          onOpenChange={setConsentOpen}
          onEnabled={() => {
            requested.current = false; // дозволити автогенерацію одразу після згоди
          }}
        />
      </>
    );
  }

  const outOfQuota = quota && quota.remaining <= 0;

  return (
    <div className="space-y-6">
      {/* Композер зверху: чек-ін — це дія, а лист і підказки — те, що читають. */}
      <CheckinComposer onDiscuss={() => openChat({ type: "checkin", key: today })} />
      <InsightCard onDiscuss={(seed) => openChat({ type: "insight", key: seed })} />

      {generating && !reflection ? (
        <div className="space-y-3">
          <Skeleton className="h-7 w-3/4 rounded-md" />
          <Skeleton className="h-40 rounded-xl" />
          <p className="text-center text-xs text-muted-foreground">
            {t("ai.reflection.generating")}
          </p>
        </div>
      ) : reflection ? (
        <motion.div
          key={reflection.periodKey}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <ReflectionCard
            content={reflection.content}
            periodStart={reflection.periodStart}
            periodEnd={reflection.periodEnd}
            createdAt={reflection.createdAt}
            onDiscuss={() => openChat({ type: "reflection", key: reflection.periodKey })}
          />
        </motion.div>
      ) : (
        <Card className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <p className="text-sm font-medium">
            {outOfQuota ? t("ai.quota.exhausted") : t("ai.reflection.empty")}
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            {outOfQuota ? t("ai.quota.resets") : t("ai.reflection.emptyHint")}
          </p>
          {!outOfQuota && !error && (
            <Button
              variant="outline"
              className="mt-2"
              disabled={generating}
              onClick={() => {
                generate({ period: "week", today, locale })
                  .unwrap()
                  .then(setReflection)
                  .catch(() => {});
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("ai.reflection.retry")}
            </Button>
          )}
        </Card>
      )}

      {/* Історія = побічний ефект кешу листів: окремої таблиці не потрібно. */}
      {history && history.length > 1 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("ai.reflection.history")}
          </h3>
          <ul className="space-y-2">
            {history
              .filter((h) => h.periodKey !== reflection?.periodKey)
              .map((h) => (
                <li key={h.periodKey}>
                  <Card className="p-3">
                    {/* Дні, а не «2026-W36»: номер ISO-тижня людині ні про що не каже. */}
                    <p className="text-xs text-muted-foreground">
                      {formatDateRange(h.periodStart, h.periodEnd, i18n.language)}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">{h.headline}</p>
                  </Card>
                </li>
              ))}
          </ul>
        </section>
      )}

      {quota && (
        <p className="text-center text-xs text-muted-foreground">
          {t("ai.quota.status", { used: quota.used, limit: quota.limit })}
        </p>
      )}
    </div>
  );
}
