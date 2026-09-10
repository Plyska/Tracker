import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, SendHorizonal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CrisisCard, useCheckinMutation, useAiPrefs } from "@/entities/ai";
import type { CheckinResponseDto } from "@/shared/api";
import { Button, Card } from "@/shared/ui";
import { todayISODate } from "@/shared/lib";
import type { Locale } from "@/shared/config/i18n";
import { CheckinReview } from "./CheckinReview";

/** Ранок — плануємо, вечір — відмічаємо. Межа приблизна: `intent` лише підказка для моделі. */
const intentForHour = (hour: number): "log" | "plan" => (hour < 12 ? "plan" : "log");

/**
 * Композер чек-іну (ADR 0012, фаза B1) — один рядок вводу замість чату.
 *
 * Свідомо не чат: у чат-бокс треба вигадувати, що написати, а тут плейсхолдер за часом доби вже
 * підказує ритуал («що зробив сьогодні?» / «що плануєш?»). Результат — не повідомлення, а
 * картка з діями, які людина підтверджує.
 *
 * `onDiscuss` — вихід у розмову (фаза B2) після розбору: чек-ін відповідає одним теплим реченням
 * і на цьому спиняється, а далі людині часто є що сказати. Кнопка з'являється лише разом із
 * карткою — до першого чек-іну кликати нема про що.
 */
export function CheckinComposer({ onDiscuss }: { onDiscuss?: () => void }) {
  const { t, i18n } = useTranslation();
  const reduce = useReducedMotion();
  const { enabled } = useAiPrefs();
  const locale = (i18n.language.startsWith("uk") ? "uk" : "en") as Locale;

  const [text, setText] = useState("");
  const [result, setResult] = useState<CheckinResponseDto | null>(null);
  const [checkin, { isLoading }] = useCheckinMutation();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const intent = intentForHour(new Date().getHours());

  if (!enabled) return null;

  const send = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    try {
      const res = await checkin({
        text: trimmed,
        today: todayISODate(),
        locale,
        intent,
      }).unwrap();
      setResult(res);
      setText("");
    } catch {
      /* показує errorToastMiddleware; текст лишається в полі, щоб не набирати заново */
    }
  };

  // Відповідь на уточнення — не окремий раунд діалогу, а доповнений чек-ін: повертаємо текст
  // у поле разом із відповіддю, щоб модель бачила повну картину одним запитом (дешевше і точніше).
  const answerClarification = (answer: string) => {
    setResult(null);
    setText((prev) => (prev ? `${prev} ${answer}` : answer));
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(text);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter шле, Shift+Enter — новий рядок: чек-ін зазвичай однорядковий.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={t(`ai.checkin.placeholder.${intent}`)}
            aria-label={t("ai.checkin.inputLabel")}
            className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" size="sm" disabled={!text.trim() || isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizonal className="h-4 w-4" />
            )}
            <span className="sr-only">{t("ai.checkin.send")}</span>
          </Button>
        </form>
      </Card>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key="review"
            initial={reduce ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0 }}
          >
            {/* Криза заміщує картку повністю — не доповнює її. Пропозиція «зберегти пробіжку?»
                поруч із такою відповіддю знецінює саму відповідь, тож сервер і дій не віддає. */}
            {result.crisis ? (
              <CrisisCard text={result.crisis} />
            ) : (
              <>
                <CheckinReview
                  result={result}
                  onDone={() => setResult(null)}
                  onAnswer={answerClarification}
                />
                {onDiscuss && (
                  <div className="mt-2 text-center">
                    <Button variant="ghost" size="sm" onClick={onDiscuss}>
                      {t("ai.chat.openFromCheckin")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
