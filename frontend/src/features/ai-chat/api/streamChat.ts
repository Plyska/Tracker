import type { CheckinActionDto, CheckinRejectedDto } from "@/shared/api";

/**
 * SSE-клієнт чату (ADR 0012, фаза B2).
 *
 * Поза RTK Query свідомо: `httpBaseQuery` побудований на `fetchBaseQuery`, який віддає ВІДПОВІДЬ
 * цілком і стрімити не вміє. Тому тут «голий» `fetch` + `ReadableStream`, але з тими самими
 * правилами транспорту, що й усюди: `credentials: "include"`, `X-CSRF-Token` із cookie і **одна**
 * спроба `POST /auth/refresh` на 401. Розійтися з `httpBaseQuery` тут не можна — інакше чат
 * ламався б рівно тоді, коли протух access-токен, тобто в найзвичайнішій ситуації.
 */

const CSRF_COOKIE = "csrf_token";

const readCookie = (name: string): string | undefined =>
  document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.slice(name.length + 1);

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export interface ChatProposal {
  actions: CheckinActionDto[];
  rejected: CheckinRejectedDto[];
  context: { today: string; weekStart: string; weekEnd: string };
}

export interface ChatRequest {
  messages: ChatMessage[];
  today: string;
  locale: "en" | "uk";
  seed?: { type: "reflection" | "insight" | "checkin"; key: string };
}

/** Події потоку — дзеркало серверних (`ai.controller.ts`). */
export interface ChatHandlers {
  onText: (delta: string) => void;
  /** Модель полізла в дані — показуємо «дивлюсь щоденник…», поки триває. */
  onTool?: (name: string) => void;
  onProposal?: (proposal: ChatProposal) => void;
  /** Машинний код помилки (`AI_QUOTA_EXCEEDED`, `AI_UNAVAILABLE`, …) — текст рендерить UI. */
  onError?: (code: string) => void;
}

const post = (body: ChatRequest, signal: AbortSignal): Promise<Response> =>
  fetch(`${import.meta.env.VITE_API_URL}/ai/chat`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(readCookie(CSRF_COOKIE) ? { "X-CSRF-Token": readCookie(CSRF_COOKIE)! } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });

/**
 * Розібрати SSE-кадри з потоку байтів. Кадр — блок рядків до порожнього рядка; нас цікавлять
 * `event:` і `data:`. Буфер потрібен, бо межі чанків мережі не збігаються з межами кадрів —
 * один кадр легко приходить двома шматками.
 */
async function* parseSse(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<{ event: string; data: string }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).trim());
      }
      if (data.length > 0) yield { event, data: data.join("\n") };
    }
  }
}

/**
 * Надіслати повідомлення й читати відповідь потоком.
 * Кидає лише на мережевій/протокольній поламці; помилки застосунку приходять через `onError`.
 */
export async function streamChat(
  body: ChatRequest,
  handlers: ChatHandlers,
  signal: AbortSignal,
): Promise<void> {
  let res = await post(body, signal);

  // Один тихий refresh на 401 — так само, як у httpBaseQuery. Другої спроби немає: якщо й після
  // оновлення сесії 401, це вже не протухлий токен, а вихід із системи.
  if (res.status === 401) {
    const refreshed = await fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (refreshed.ok) res = await post(body, signal);
  }

  if (!res.ok || !res.body) {
    // Помилки ДО відкриття потоку приходять звичайним JSON (`ApiError`) — саме тому всі
    // перевірки на сервері зроблено до `writeHead`.
    let code = "AI_UNAVAILABLE";
    try {
      code = ((await res.json()) as { code?: string }).code ?? code;
    } catch {
      /* не JSON — лишаємо загальний код */
    }
    handlers.onError?.(code);
    return;
  }

  for await (const { event, data } of parseSse(res.body)) {
    if (event === "text") handlers.onText((JSON.parse(data) as { delta: string }).delta);
    else if (event === "tool") handlers.onTool?.((JSON.parse(data) as { name: string }).name);
    else if (event === "proposal") handlers.onProposal?.(JSON.parse(data) as ChatProposal);
    else if (event === "error") handlers.onError?.((JSON.parse(data) as { code: string }).code);
    // `done` не потребує дії: потік закривається сам, а квота оновиться інвалідацією тега.
  }
}
