import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Card } from "@/shared/ui";

const MotionCard = motion.create(Card);

/**
 * Телефон у тексті → клікабельне посилання: у кризі натиснути простіше, ніж набрати.
 * Два регекси навмисно: глобальний для `split` (він має стан `lastIndex`, тож для перевірок
 * непридатний) і окремий беззастережний для порівняння частини.
 */
const PHONE_SPLIT = /\b(7333|112|103)\b/g;
const IS_PHONE = /^(7333|112|103)$/;

/**
 * Кризова відповідь замість листа (ADR 0012, кризовий протокол).
 *
 * Свідомо ОКРЕМА картка, а не варіант `ReflectionCard`. У прогоні тон-тестів виявилось, що
 * навіть якби модель написала кризовий текст, картка листа намалювала б його під рубриками
 * «Що вдалося / Що просіло» — і статистика звичок стояла б поруч із розмовою про життя.
 *
 * Тут немає ні чисел, ні розділів, ні питання: лише те, що людині зараз потрібно.
 * Текст приходить із сервера готовим (`ai.prompts.ts` → `crisisReply`), бо контакти мусять бути
 * дослівні, а формулювання — без роду.
 */
export function CrisisCard({ text }: { text: string }) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();

  return (
    <MotionCard
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-3 border-primary/40 bg-primary/5 p-5 sm:p-6"
      role="note"
      aria-label={t("ai.crisis.title")}
    >
      {text.split("\n").map((line, i) =>
        line.trim() === "" ? (
          <div key={i} className="h-1" />
        ) : (
          <p key={i} className="text-sm leading-relaxed">
            {/* Розбиваємо рядок на текст і номери, щоб номер став посиланням `tel:`. */}
            {line.split(PHONE_SPLIT).map((part, j) =>
              IS_PHONE.test(part) ? (
                <a
                  key={j}
                  href={`tel:${part}`}
                  className="font-semibold text-primary underline underline-offset-4"
                >
                  {part}
                </a>
              ) : (
                <span key={j}>{part}</span>
              ),
            )}
          </p>
        ),
      )}
    </MotionCard>
  );
}
