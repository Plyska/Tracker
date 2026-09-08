import { useCallback, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { HeartPulse, Sparkles, TrendingDown, Waypoints, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useGetInsightsQuery,
  INSIGHT_VARIANTS,
  hideInsight,
  isInsightHidden,
  unhideInsight,
} from "@/entities/ai";
import { Card, IconButton, toast } from "@/shared/ui";
import { cn, minutesToHoursLabel, todayISODate } from "@/shared/lib";

const MotionCard = motion.create(Card);

const ICONS: Record<string, LucideIcon> = {
  lowMoodStreak: HeartPulse,
  comeback: Sparkles,
  streakBroken: TrendingDown,
  weeklyTargetAtRisk: TrendingDown,
  synergyFound: Waypoints,
  perfectWeek: Sparkles,
};

/**
 * Підказка-патерн на Dashboard (ADR 0012, план §3.4).
 *
 * Текст рендериться з i18n-шаблону за `key`+`variant` — сервер віддає лише ключ і числа, тож
 * підказка не може «вигадати» цифру. `variant` ротує формулювання за днем: те саме за день,
 * інше — завтра (проти відчуття шаблонності).
 *
 * Показуємо ЗАВЖДИ одну картку: дві поради одночасно вже читаються як стрічка сповіщень.
 */
export function InsightCard({ onDiscuss }: { onDiscuss?: (seed: string) => void }) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const today = todayISODate();
  const { data } = useGetInsightsQuery({ today });
  // Приховування живе в localStorage, тож стану React про нього немає — цей лічильник лише
  // змушує перечитати сховище після приховування/повернення.
  const [revision, setRevision] = useState(0);

  const dismiss = useCallback(
    (key: string) => {
      hideInsight(key, today);
      setRevision((r) => r + 1);
      // Undo одразу: приховування має кулдаун на кілька днів, тож випадковий клік дорого
      // коштує — краще дати повернути, ніж змушувати шукати кнопку в Налаштуваннях.
      toast.success(t("ai.insights.dismissed"), {
        label: t("ai.insights.undo"),
        onClick: () => {
          unhideInsight(key, today);
          setRevision((r) => r + 1);
        },
      });
    },
    [today, t],
  );

  void revision; // залежність для перечитування сховища нижче
  const insight = data?.find((i) => !isInsightHidden(i.key, today));
  if (!insight) return null;

  const Icon = ICONS[insight.key] ?? Sparkles;
  // Варіант із сервера може вийти за межі набору, якщо i18n і бекенд розійшлися — беремо по модулю,
  // а якщо конкретного варіанта в перекладі нема, відкочуємось на v0 (замість показу сирого ключа).
  const variant = insight.variant % INSIGHT_VARIANTS;

  // Числа з одиницями складаємо ДО підстановки в шаблон. Сервер шле `remaining` разом з `unit`, і
  // без одиниці «лишилось 120» для часової звички читалось би як 120 разів, а не дві години.
  // `daysLeft` теж проганяємо через плюралізацію: «до кінця тижня 1 дні» українською неграмотно,
  // а готові відмінки вже є в `statistics.unit.days` — другий набір тримати немає сенсу.
  const params =
    insight.key === "weeklyTargetAtRisk"
      ? {
          ...insight.params,
          remaining:
            insight.params.unit === "minutes"
              ? t("ai.insights.unit.hours", {
                  value: minutesToHoursLabel(Number(insight.params.remaining)),
                })
              : t("ai.insights.unit.times", { count: Number(insight.params.remaining) }),
          daysLeft: t("statistics.unit.days", { count: Number(insight.params.daysLeft) }),
        }
      : insight.params;

  const text =
    (t(`ai.insights.${insight.key}.v${variant}`, {
      ...params,
      defaultValue: "",
    }) as string) || (t(`ai.insights.${insight.key}.v0`, params) as string);

  return (
    <MotionCard
      initial={reduce ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "flex items-center gap-3 p-4",
        insight.severity === "care" && "border-primary/40 bg-primary/5",
      )}
    >
      <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed">{text}</p>
        {onDiscuss && (
          <button
            type="button"
            onClick={() => onDiscuss(insight.seed)}
            className="mt-2 text-xs font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:underline"
          >
            {t("ai.insights.discuss")}
          </button>
        )}
      </div>
      <IconButton
        aria-label={t("ai.insights.dismiss")}
        onClick={() => dismiss(insight.key)}
        className="h-7 w-7 shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </IconButton>
    </MotionCard>
  );
}
