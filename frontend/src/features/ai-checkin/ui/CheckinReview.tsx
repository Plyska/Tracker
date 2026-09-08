import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CalendarPlus, Check, NotebookPen, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HabitGlyph, useGetHabitsQuery } from "@/entities/habit";
import { useToggleEntryMutation } from "@/entities/habit-entry";
import { MoodPicker, useGetDailyLogsQuery, useUpsertDailyLogMutation } from "@/entities/daily-log";
import { useAddTaskMutation } from "@/entities/task";
import type { CheckinActionDto, CheckinResponseDto } from "@/shared/api";
import { Button, Card, toast } from "@/shared/ui";
import { addDaysISO, formatCellDuration, fromISODate } from "@/shared/lib";
import { actionId, planDailyLogs } from "../lib/actions";

/**
 * Пропозиція дій — прийшла вона з чек-іну чи з чату (`propose_actions`), однаково: `reply` і
 * `clarifications` є лише в чек-іну, бо в чаті репліка вже надрукована в потоці.
 */
export type ProposalLike = Pick<CheckinResponseDto, "actions" | "rejected" | "context"> &
  Partial<Pick<CheckinResponseDto, "reply" | "clarifications">>;

/**
 * Картка підтвердження (ADR 0012: модель пропонує — записує людина).
 *
 * Одна картка на обидва шляхи — чек-ін і чат: запис іде ТИМИ САМИМИ мутаціями, що й ручні дії,
 * тож оптимістичні патчі, інвалідація статистики й підказок працюють без окремого шляху.
 */
export function CheckinReview({
  result,
  onDone,
  onAnswer,
}: {
  result: ProposalLike;
  onDone: () => void;
  /** Відповідь на уточнення — повертає текст у композер (лише чек-ін). */
  onAnswer?: (text: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const reduce = useReducedMotion();
  const { data: habits } = useGetHabitsQuery();

  // Наявні логи тижня потрібні ДО запису: настрій обов'язковий, а нотатки заміняться —
  // тож текст дописуємо до вже наявного, а не поверх нього.
  const { data: logs } = useGetDailyLogsQuery({
    from: result.context.weekStart,
    to: result.context.weekEnd,
  });

  const [toggleEntry] = useToggleEntryMutation();
  const [upsertLog] = useUpsertDailyLogMutation();
  const [addTask] = useAddTaskMutation();
  const [saving, setSaving] = useState(false);

  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [moodOverride, setMoodOverride] = useState<Record<string, number>>({});

  const selected = useMemo(
    () => result.actions.filter((a, i) => !excluded.has(actionId(a, i))),
    [result.actions, excluded],
  );

  const existingByDate = useMemo(
    () => new Map((logs ?? []).map((l) => [l.date, { mood: l.mood, notes: l.notes ?? null }])),
    [logs],
  );

  // Дні, для яких доведеться писати лог, і чи є в них настрій. Порожній настрій — блокер:
  // `PUT /daily-logs` вимагає mood, тож без нього запис у щоденник просто не збережеться.
  const logPlans = useMemo(
    () => planDailyLogs(selected, existingByDate),
    [selected, existingByDate],
  );
  const needsMood = logPlans.filter((p) => p.mood === null && moodOverride[p.date] === undefined);

  const habitById = useMemo(
    () => new Map((habits ?? []).map((h) => [h.id, h])),
    [habits],
  );

  // Слово має відповідати дії. «Записати» для задачі на суботу читається як «відмітити
  // виконаним», а відмітити наперед не можна — це саме те непорозуміння, через яке картка
  // виглядала дивно. Змішаний набір лишається під загальним «Записати».
  const allTasks = selected.length > 0 && selected.every((a) => a.type === "task");

  const toggle = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const commit = async () => {
    setSaving(true);
    try {
      // Порядок: відмітки → логи → задачі. Логи йдуть одним викликом на день (mood+notes разом),
      // інакше другий виклик затер би notes першого.
      for (const a of selected) {
        if (a.type === "entry") {
          await toggleEntry({
            habitId: a.habitId,
            date: a.date,
            done: a.done,
            minutes: a.minutes,
          }).unwrap();
        }
      }
      for (const plan of logPlans) {
        const mood = plan.mood ?? moodOverride[plan.date];
        if (mood === undefined) continue; // недосяжно: кнопка заблокована, поки настрій не обрано
        await upsertLog({
          date: plan.date,
          mood,
          ...(plan.notes !== null ? { notes: plan.notes } : {}),
        }).unwrap();
      }
      for (const a of selected) {
        if (a.type === "task") {
          await addTask({
            date: a.date,
            title: a.title,
            startTime: a.startTime,
            endTime: a.endTime,
            habitId: a.habitId,
          }).unwrap();
        }
      }
      toast.success(
        t(allTasks ? "ai.checkin.planned" : "ai.checkin.saved", { count: selected.length }),
      );
      onDone();
    } catch {
      /* повідомлення показує errorToastMiddleware; картка лишається, щоб можна було повторити */
    } finally {
      setSaving(false);
    }
  };

  /**
   * Коли саме. Без цього підпису картка не давала відповіді на найважливіше питання: «Зал» —
   * а на який день? Найближчі два дні називаємо словами, решту — днем тижня з числом, бо саме
   * дня тижня бракує, щоб зрозуміти пропозицію («у суботу» читається, «12.09» — ні).
   */
  const dayLabel = (date: string): string => {
    if (date === result.context.today) return t("ai.checkin.dateToday");
    if (date === addDaysISO(result.context.today, 1)) return t("ai.checkin.dateTomorrow");
    return fromISODate(date).toLocaleDateString(i18n.language, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const renderLabel = (a: CheckinActionDto) => {
    if (a.type === "entry") {
      const habit = habitById.get(a.habitId);
      const name = habit?.name ?? t("ai.checkin.unknownHabit");
      // Чек-ін може відмічати й інші дні тижня — тоді день обов'язково видно.
      const when = a.date === result.context.today ? "" : ` · ${dayLabel(a.date)}`;
      if (!a.done) return `${t("ai.checkin.entrySkipped", { habit: name })}${when}`;
      if (a.minutes === null) return `${name}${when}`;
      // Хвилини заміняють записані — показуємо перехід, щоб заміна не була тихою.
      const mins =
        a.prevMinutes != null && a.prevMinutes !== a.minutes
          ? `${formatCellDuration(a.prevMinutes)} → ${formatCellDuration(a.minutes)}`
          : formatCellDuration(a.minutes);
      return `${name} · ${mins}${when}`;
    }
    if (a.type === "mood") return t("ai.checkin.moodLabel", { value: a.value });
    if (a.type === "diary") return a.text;
    // Задача: день — головне, час — якщо названо. Без дати це «Загальна» картка Розпорядку.
    const when = a.date ? ` · ${dayLabel(a.date)}` : ` · ${t("ai.checkin.dateNone")}`;
    const time = a.startTime ? `, ${a.startTime}${a.endTime ? `–${a.endTime}` : ""}` : "";
    return `${a.title}${when}${time}`;
  };

  const renderIcon = (a: CheckinActionDto) => {
    if (a.type === "entry") {
      const habit = habitById.get(a.habitId);
      return habit ? (
        <HabitGlyph
          name={habit.name}
          color={habit.color}
          icon={habit.icon}
          className="h-6 w-6 shrink-0"
          iconClassName="h-3.5 w-3.5"
        />
      ) : (
        <span className="h-6 w-6 shrink-0 rounded-full bg-muted" />
      );
    }
    const Icon = a.type === "task" ? CalendarPlus : NotebookPen;
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </span>
    );
  };

  const hasActions = result.actions.length > 0;

  return (
    <Card className="space-y-4 p-4">
      {result.reply && <p className="text-sm leading-relaxed">{result.reply}</p>}

      {hasActions && (
        <ul className="space-y-1">
          {result.actions.map((a, i) => {
            const id = actionId(a, i);
            const on = !excluded.has(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-pressed={on}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/60 ${
                    on ? "" : "opacity-45"
                  }`}
                >
                  {renderIcon(a)}
                  <span className="flex-1 text-sm leading-snug">{renderLabel(a)}</span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    }`}
                    aria-hidden
                  >
                    {on && <Check className="h-3.5 w-3.5" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Настрій обов'язковий для запису в щоденник — просимо явно, а не тихо втрачаємо текст. */}
      <AnimatePresence initial={false}>
        {needsMood.map((plan) => (
          <motion.div
            key={plan.date}
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-xs text-muted-foreground">{t("ai.checkin.moodNeeded")}</span>
              <MoodPicker
                size="sm"
                value={moodOverride[plan.date]}
                onChange={(v) => setMoodOverride((prev) => ({ ...prev, [plan.date]: v }))}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {result.clarifications && result.clarifications.length > 0 && onAnswer && (
        <div className="space-y-2">
          {result.clarifications.map((c) => (
            <div key={c.field} className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-sm">{c.question}</p>
              {c.options.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onAnswer(opt)}
                      className="rounded-full border border-border px-2.5 py-1 text-xs transition-colors hover:bg-background"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Відкинуте сервером — з причиною. Мовчазне зникнення дії читалося б як баг. */}
      {result.rejected.length > 0 && (
        <ul className="space-y-1">
          {result.rejected.map((r, i) => (
            <li key={`${r.reason}:${r.detail}:${i}`} className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="text-xs text-muted-foreground">
                {t(`ai.checkin.rejected.${r.reason}`, { detail: r.detail })}
              </span>
            </li>
          ))}
        </ul>
      )}

      {hasActions && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onDone} disabled={saving} className="sm:w-auto">
            <X className="mr-1.5 h-4 w-4" />
            {t("ai.checkin.discard")}
          </Button>
          <Button
            onClick={commit}
            disabled={saving || selected.length === 0 || needsMood.length > 0}
            className="sm:w-auto"
          >
            <Check className="mr-1.5 h-4 w-4" />
            {t(allTasks ? "ai.checkin.plan" : "ai.checkin.confirm", { count: selected.length })}
          </Button>
        </div>
      )}
    </Card>
  );
}
