import {
  Activity,
  Award,
  CalendarDays,
  CalendarRange,
  Flame,
  HeartPulse,
  Medal,
  Percent,
  Repeat2,
  Smile,
  Sparkles,
  Target,
  Trophy,
  TrendingUp,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

/**
 * Каталог віджетів сторінки Statistics — спільне джерело для рендера (`StatisticsView`/`MetricCards`)
 * і для перемикачів видимості в Settings. Додаєш новий → додаєш сюди запис (типово видимий,
 * бо зберігаємо саме приховані ключі).
 */
export interface StatWidgetMeta {
  key: string;
  /** i18n-ключ підпису. */
  labelKey: string;
  icon: LucideIcon;
}

/** Окремі метрики (плитки верхнього ряду) — вимикаються поштучно. Ключі/підписи — як у MetricCards. */
export const STAT_METRICS: StatWidgetMeta[] = [
  { key: "completion", labelKey: "statistics.metric.completion", icon: Percent },
  { key: "currentStreak", labelKey: "statistics.metric.currentStreak", icon: Flame },
  { key: "longestStreak", labelKey: "statistics.metric.longestStreak", icon: Award },
  { key: "perfectDays", labelKey: "statistics.metric.perfectDays", icon: Sparkles },
  { key: "bestHabit", labelKey: "statistics.metric.bestHabit", icon: Trophy },
  { key: "moodAverage", labelKey: "statistics.metric.moodAverage", icon: Smile },
];

/** Великі блоки-віджети. Усі ключі (метрик і блоків) спільно живуть у `hiddenStatWidgets`. */
export const STAT_WIDGETS: StatWidgetMeta[] = [
  { key: "goal", labelKey: "statistics.widgets.goal", icon: Target },
  { key: "progress", labelKey: "statistics.widgets.progress", icon: TrendingUp },
  { key: "movers", labelKey: "statistics.widgets.movers", icon: Repeat2 },
  { key: "weekday", labelKey: "statistics.widgets.weekday", icon: CalendarDays },
  { key: "synergy", labelKey: "statistics.widgets.synergy", icon: Waypoints },
  { key: "milestones", labelKey: "statistics.widgets.milestones", icon: Medal },
  { key: "activity", labelKey: "statistics.widgets.activity", icon: Activity },
  { key: "mood", labelKey: "statistics.widgets.mood", icon: HeartPulse },
  { key: "heatmap", labelKey: "statistics.widgets.heatmap", icon: CalendarRange },
];
