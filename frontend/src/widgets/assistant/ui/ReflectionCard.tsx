import { motion, useReducedMotion } from "framer-motion";
import { CircleCheck, CircleMinus, Lightbulb, MessageCircleQuestion } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HabitGlyph, useGetHabitsQuery } from "@/entities/habit";
import type { ReflectionContentDto, ReflectionItemDto } from "@/shared/api";
import { BetaBadge } from "@/features/ai-consent";
import { Button, Card } from "@/shared/ui";
import { formatDateRange } from "@/shared/lib";

const MotionCard = motion.create(Card);

/**
 * Лист-підсумок (ADR 0012). Рендериться СТРУКТУРНО (перемоги / просідання / патерн / питання),
 * а не «стіною тексту» — саме заради цього модель віддає strict JSON. Пункти з `habitId`
 * отримують гліф навички: лист візуально зчеплений із таблицею, а не абстрактний.
 * `habitId` уже звірено на сервері — тут просто не знаходимо навичку, якщо її видалили.
 */
export function ReflectionCard({
  content,
  periodStart,
  periodEnd,
  createdAt,
  onDiscuss,
}: {
  content: ReflectionContentDto;
  /** Межі періоду (ISO) — лист завжди про ЗАВЕРШЕНИЙ тиждень, і це має бути видно. */
  periodStart: string;
  periodEnd: string;
  createdAt?: string;
  /** Відкрити розмову про цей лист (фаза B2); без нього кнопка не показується. */
  onDiscuss?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const reduce = useReducedMotion();
  const { data: habits } = useGetHabitsQuery();

  const renderItem = (item: ReflectionItemDto, i: number) => {
    const habit = item.habitId ? habits?.find((h) => h.id === item.habitId) : undefined;
    return (
      // items-center: іконка центрується відносно всього блоку тексту (і на 1, і на 2 рядки) —
      // ручні mt-* відступи давали розʼїзд, щойно текст переносився.
      <li key={i} className="flex items-center gap-2.5">
        {habit ? (
          <HabitGlyph
            name={habit.name}
            color={habit.color}
            icon={habit.icon}
            className="h-6 w-6 shrink-0"
            iconClassName="h-3.5 w-3.5"
          />
        ) : (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
        )}
        <span className="text-sm leading-relaxed">{item.text}</span>
      </li>
    );
  };

  return (
    <MotionCard
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-5 p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {/* Період — над заголовком: лист про ЗАВЕРШЕНИЙ тиждень, і без цього підпису числа в
              ньому легко прочитати як «за сьогодні». */}
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {formatDateRange(periodStart, periodEnd, i18n.language)}
          </p>
          <p className="text-base font-medium leading-relaxed sm:text-lg">
            {content.headline}
          </p>
        </div>
        <BetaBadge />
      </div>

      {content.highlights.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CircleCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("ai.reflection.highlights")}
          </h3>
          <ul className="space-y-2">{content.highlights.map(renderItem)}</ul>
        </section>
      )}

      {content.slips.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CircleMinus className="h-3.5 w-3.5" aria-hidden />
            {t("ai.reflection.slips")}
          </h3>
          <ul className="space-y-2">{content.slips.map(renderItem)}</ul>
        </section>
      )}

      {content.pattern && (
        <section className="flex items-center gap-2.5 rounded-lg border border-border bg-background p-3">
          <Lightbulb className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p className="text-sm leading-relaxed">{content.pattern.text}</p>
        </section>
      )}

      {/* Питання листа — природна точка входу в розмову: відповідати на нього хочеться, і
          саме тому кнопка стоїть тут, а не окремо внизу картки. */}
      <section className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center gap-2.5">
          <MessageCircleQuestion className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p className="text-sm font-medium leading-relaxed">{content.question}</p>
        </div>
        {onDiscuss && (
          <Button variant="outline" size="sm" onClick={onDiscuss}>
            {t("ai.chat.openFromReflection")}
          </Button>
        )}
      </section>

      {createdAt && (
        <p className="text-right text-xs text-muted-foreground">
          {new Date(createdAt).toLocaleDateString(i18n.language, {
            day: "numeric",
            month: "long",
          })}
        </p>
      )}
    </MotionCard>
  );
}
