import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { useAiPrefs } from "@/entities/ai";
import { ChatThread, threadStarted, type ChatSeed } from "@/features/ai-chat";
import { paths } from "@/shared/config/paths";
import { Skeleton } from "@/shared/ui";

/**
 * Сторінка розмови (ADR 0012, фаза B2).
 *
 * Окремий роут, а не стан на `/assistant`: у чата власний повноекранний layout (список
 * скролиться, поле вводу закріплене внизу), і вихід із нього — звичайне «назад» браузера.
 *
 * Зачіпка (`seed`) приїжджає в стані навігації з листа, підказки або чек-іну. Її відсутність —
 * не помилка: на `/assistant/chat` можна зайти й прямим посиланням, тоді розмова просто
 * починається з чистого аркуша.
 */
function AssistantChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { enabled, isLoading } = useAiPrefs();

  /**
   * Зачіпка з CTA стартує розмову — але **лише якщо треду ще немає**. Наявна розмова просто
   * відкривається: «Обговорити тиждень» при живому діалозі не має стирати те, що людина щойно
   * писала. Почати наново можна явно — кнопкою «Завершити розмову».
   *
   * Стан навігації гасимо в обох випадках: браузер відновлює його при перезавантаженні, і без
   * цього F5 знову виглядав би як вхід із CTA.
   */
  const hasThread = useAppSelector((s) => s.aiChat.messages.length > 0);
  useEffect(() => {
    const seed = (location.state as { seed?: ChatSeed } | null)?.seed;
    if (!seed) return;
    if (!hasThread) dispatch(threadStarted(seed));
    void navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate, dispatch, hasThread]);

  if (isLoading) return <Skeleton className="min-h-0 flex-1 rounded-xl" />;

  // Прямий захід без згоди — на інтро, а не в порожній чат: там пояснення й вмикач.
  if (!enabled) return <Navigate to={paths.assistant} replace />;

  return <ChatThread onClose={() => void navigate(paths.assistant)} />;
}

export default AssistantChatPage;
