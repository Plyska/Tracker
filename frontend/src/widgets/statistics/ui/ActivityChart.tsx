import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useStatsData } from "@/features/stats-period";
import { Card, InfoHint, Skeleton } from "@/shared/ui";
import { getDateFnsLocale } from "@/shared/lib";

const MotionCard = motion.create(Card);

/** Площинний графік % виконання по днях за вибраний період (recharts). */
export function ActivityChart() {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateFnsLocale(i18n.language);
  const reduce = useReducedMotion();
  const { stats, isLoading, key } = useStatsData();

  const data = useMemo(
    () =>
      (stats?.daily ?? []).map((d) => ({
        date: d.date,
        rate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
      })),
    [stats],
  );

  if (isLoading || !stats) return <Skeleton className="h-96 rounded-xl" />;

  const fmtTick = (iso: string) => format(parseISO(iso), "d MMM", { locale: dateLocale });

  // На довгих періодах (рік/увесь час) точок забагато — даємо мін. ширину ~6px/день і скрол по X
  // (щільніший графік, менше скролу). Тиждень/місяць (≤40 днів) уміщаються без скролу.
  const scrollable = data.length > 40;
  const minWidth = scrollable ? data.length * 6 : undefined;

  return (
    <MotionCard
      key={key}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col gap-3 p-4 sm:p-5 lg:h-full"
    >
      <div className="flex items-center gap-1.5">
        <h3 className="text-sm font-semibold">{t("statistics.activity.title")}</h3>
        <InfoHint label={t("statistics.activity.info")} />
      </div>
      {/* Мобільний/планшет (стек): фіксована висота — ResponsiveContainer height="100%" мусить
          міряти сталий контейнер, інакше ResizeObserver зациклюється й графік мерехтить.
          lg (поруч із «Настрій»): flex-1 заповнює картку, яку grid-stretch тягне до висоти Mood-
          картки → однакова висота. overflow-x-auto — горизонт. скрол на довгих періодах. */}
      <div className="h-64 overflow-x-auto overflow-y-hidden sm:h-72 lg:h-auto lg:min-h-0 lg:flex-1 [&_*:focus-visible]:outline-none [&_*:focus]:outline-none">
        <div className="h-full w-full" style={{ minWidth }}>
          <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
            accessibilityLayer={false}
          >
            <defs>
              <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtTick}
              minTickGap={32}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              stroke="var(--border)"
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              stroke="var(--border)"
              width={44}
            />
            <Tooltip
              formatter={(v) => [`${v}%`, t("statistics.metric.completion")]}
              labelFormatter={(iso) =>
                typeof iso === "string"
                  ? format(parseISO(iso), "d MMM yyyy", { locale: dateLocale })
                  : ""
              }
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--foreground)",
              }}
            />
            <Area
              type="monotone"
              dataKey="rate"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#activityFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
        </div>
      </div>
    </MotionCard>
  );
}
