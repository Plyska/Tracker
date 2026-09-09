import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, SendHorizonal, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { aiApi, useGetAiQuotaQuery } from "@/entities/ai";
import { CheckinReview } from "@/features/ai-checkin";
import { Button, Card, toast } from "@/shared/ui";
import { cn, todayISODate } from "@/shared/lib";
import type { Locale } from "@/shared/config/i18n";
import { streamChat, type ChatMessage } from "../api/streamChat";
import {
  messageAppended,
  proposalDismissed,
  proposalReceived,
  threadCleared,
} from "../model/chatSlice";

/**
 * Скільки ходів їде на сервер. Дзеркало серверної стелі (`chatBodySchema`: max 24) — ріжемо саме
 * тут, бо інакше 25-те повідомлення довгої розмови впало б у валідацію 400, і людина побачила б
 * загальну помилку рівно там, де розмова стала цікавою. Ріжемо з початку: свіжі ходи важливіші,
 * а на екрані лишається все — обрізаний хвіст не зникає з очей, лише з запиту.
 */
const MAX_SENT_TURNS = 24;

/**
 * Тред розмови (ADR 0012, фаза B2).
 *
 * Історія **не покидає пристрій**: на сервері не зберігається взагалі, локально живе в слайсі й
 * `sessionStorage` — тобто вмирає разом із вкладкою. Це визначає й UX: чат тут не «месенджер із
 * листуванням», а продовження конкретної думки — людина приходить із листа, підказки або
 * чек-іну (`seed`), а не у порожнє вікно.
 */
export function ChatThread({ onClose }: { onClose?: () => void }) {
  const { t, i18n } = useTranslation();
  const reduce = useReducedMotion();
  const dispatch = useAppDispatch();
  const locale = (i18n.language.startsWith("uk") ? "uk" : "en") as Locale;

  // Тривке — у сторі (переживає навігацію й перезавантаження вкладки).
  const seed = useAppSelector((s) => s.aiChat.seed);
  const messages = useAppSelector((s) => s.aiChat.messages);
  const proposal = useAppSelector((s) => s.aiChat.proposal);

  // Транзієнтне — локально: відновлювати обірваний стрім нема сенсу.
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [tool, setTool] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sentSeed = useRef(false);

  // Залишок денної квоти. Тут він доречніший, ніж будь-де: у чаті кожна репліка коштує запит, і
  // впертись у стелю посеред розмови — найгірший момент дізнатись про ліміт. Кеш оновлюється сам:
  // після кожного ходу тред інвалідує тег `Ai/QUOTA` (див. `send`).
  const { data: quota } = useGetAiQuotaQuery({ today: todayISODate() });
  const outOfQuota = quota ? quota.remaining <= 0 : false;

  const busy = streaming !== null;

  /**
   * Помилки — тостом, як і скрізь у застосунку. Чат іде повз RTK Query, тож
   * `errorToastMiddleware` його не бачить: без цього вичерпана денна квота повідомляла про себе
   * сірим рядком у кутку, який легко проґавити й довго не розуміти, чому асистент мовчить.
   */
  const showError = (code: string) => {
    const key = `errors.${code}`;
    toast.error(i18n.exists(key) ? t(key) : t("errors.generic"));
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const history: ChatMessage[] = [...messages, { role: "user", text: trimmed }];
    dispatch(messageAppended({ role: "user", text: trimmed }));
    setDraft("");
    dispatch(proposalDismissed());
    setStreaming("");

    const controller = new AbortController();
    abortRef.current = controller;
    let acc = "";

    try {
      await streamChat(
        {
          messages: history.slice(-MAX_SENT_TURNS),
          today: todayISODate(),
          locale,
          // Засів — лише на першому ході: далі розмова вже має власний контекст, а `opened_from`
          // на кожному запиті збивав би модель назад до картки, з якої все почалось.
          seed: seed && history.length === 1 ? { type: seed.type, key: seed.key } : undefined,
        },
        {
          onText: (delta) => {
            acc += delta;
            setStreaming(acc);
          },
          onTool: setTool,
          onProposal: (p) => dispatch(proposalReceived(p)),
          onError: showError,
        },
        controller.signal,
      );
    } catch {
      // Обрив мережі (або натиснуто «стоп») — те, що встигло надрукуватись, лишаємо в треді.
      if (!controller.signal.aborted) showError("AI_UNAVAILABLE");
    } finally {
      abortRef.current = null;
      setTool(null);
      setStreaming(null);
      // Часткова відповідь усе одно цінна: людина її вже прочитала, і в історії вона має бути,
      // інакше наступний хід звертався б до тексту, якого «не існує».
      if (acc) dispatch(messageAppended({ role: "model", text: acc }));
      // Квота витрачена — оновлюємо лічильник (сам чат кешу RTK Query не має).
      dispatch(aiApi.util.invalidateTags([{ type: "Ai", id: "QUOTA" }]));
    }
  };

  /**
   * Перший хід із зачіпки. Умова `messages.length === 0` — не косметика, а те, що відрізняє
   * «нову розмову» від «відновленої»: після перезавантаження або повернення на сторінку зачіпка
   * лежить у сторі поруч із уже наявними репліками, і без цієї перевірки чат мовчки шле перший
   * хід ще раз — зайвий запит і підмінений текст.
   */
  useEffect(() => {
    if (!seed || messages.length > 0 || sentSeed.current) return;
    // Чекаємо на квоту, перш ніж почати. Без цього вичерпаний ліміт давав НАЙГІРШИЙ із можливих
    // станів: репліка людини вже в треді, відповіді не буде ніколи (сітка `messages.length > 0`
    // більше не пустить засів), і розмова лишається мертвою — з тостом, який давно зник.
    if (!quota) return;
    sentSeed.current = true;
    if (quota.remaining <= 0) {
      showError("AI_QUOTA_EXCEEDED");
      return;
    }
    // Правило б'є по `setStreaming` усередині `send`, але це якраз той випадок, який його ж
    // документація дозволяє: ефект стартує зовнішню дію (мережевий запит), а стан — її побічний
    // ефект. Перенести це в обробник події ніде: перший хід робить не людина, а прихід сторінки.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void send(t(`ai.chat.opener.${seed.type}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- намір: один засів, коли квота відома
  }, [seed, quota]);

  // Тримаємо стрічку внизу. Скролимо САМ контейнер, а не `scrollIntoView` по якорю: той тягне за
  // собою й предків, тобто смикав би всю сторінку разом із закріпленим полем вводу.
  useEffect(() => {
    const el = listRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messages, streaming, proposal, reduce]);

  return (
    // Повна висота: скролиться ЛИШЕ стрічка, поле вводу закріплене внизу — як у будь-якому чаті.
    // `min-h-0` обов'язковий у кожного flex-предка, інакше дочірній `overflow-y-auto` не має від
    // чого відштовхнутись і замість скролу стрічки розтягується вся сторінка.
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        <ul className="space-y-3">
          {messages.map((m, i) => (
            <li
              key={i}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {m.text}
              </div>
            </li>
          ))}

          {streaming !== null && (
            <li className="flex justify-start">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-muted px-3.5 py-2 text-sm leading-relaxed">
                {streaming || (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    {tool ? t(`ai.chat.tool.${tool}`, t("ai.chat.thinking")) : t("ai.chat.thinking")}
                  </span>
                )}
              </div>
            </li>
          )}
        </ul>

        <AnimatePresence initial={false}>
          {proposal && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0 }}
            >
              {/* Та сама картка, що в чек-іні: один шлях запису, одні правила. */}
              <CheckinReview result={proposal} onDone={() => dispatch(proposalDismissed())} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Card className="mt-3 shrink-0 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            rows={1}
            maxLength={4000}
            disabled={outOfQuota}
            placeholder={outOfQuota ? t("ai.quota.exhausted") : t("ai.chat.placeholder")}
            aria-label={t("ai.chat.inputLabel")}
            className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          {busy ? (
            // «Стоп» замість заблокованої кнопки: обриваємо стрім, а не змушуємо дочекатись.
            <Button type="button" size="sm" variant="outline" onClick={() => abortRef.current?.abort()}>
              <Square className="h-3.5 w-3.5" />
              <span className="sr-only">{t("ai.chat.stop")}</span>
            </Button>
          ) : (
            <Button type="submit" size="sm" disabled={!draft.trim() || outOfQuota}>
              <SendHorizonal className="h-4 w-4" />
              <span className="sr-only">{t("ai.chat.send")}</span>
            </Button>
          )}
        </form>
      </Card>

      <div className="flex shrink-0 items-center justify-between gap-3 pt-2">
        {/* Залишок квоти. Приглушено, поки запас є, і акцентом на останніх трьох: дізнатись про
            стелю варто ДО того, як упреться, а не з помилки посеред думки. */}
        {quota ? (
          <p
            className={cn(
              "text-xs",
              quota.remaining <= 3 ? "text-primary" : "text-muted-foreground",
            )}
          >
            {outOfQuota
              ? `${t("ai.quota.exhausted")} · ${t("ai.quota.resets")}`
              : t("ai.quota.remaining", { count: quota.remaining })}
          </p>
        ) : (
          <span />
        )}

        {/* Вихід із розмови. Тред ефемерний, тож кнопка чесно означає «і воно зникне» — на
            відміну від «назад» браузера, яке виглядає оборотним, хоч насправді таке саме. */}
        {onClose && messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              dispatch(threadCleared());
              onClose();
            }}
          >
            {t("ai.chat.close")}
          </Button>
        )}
      </div>
    </div>
  );
}
