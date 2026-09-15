import * as Sentry from "@sentry/react";

/**
 * Ініціалізація Sentry для **застосунку**. Імпортується найпершим рядком `main.tsx`.
 *
 * Без DSN не вмикається взагалі — локально помилки видно в консолі браузера, і засмічувати ними
 * прод-проєкт не треба. Та сама домовленість, що на бекенді (`backend/src/instrument.ts`).
 *
 * ## Лендінг сюди НЕ входить
 *
 * `src/landing/main.tsx` — окрема точка входу Vite, і цей файл вона не імпортує навмисно. Лендінг
 * зроблено легким свідомо (~124 КБ gzip проти ~300 КБ застосунку), а SDK додав би до нього десятки
 * кілобайтів заради помилок на статичній маркетинговій сторінці. Помилки, які варто ловити, живуть
 * у застосунку.
 *
 * ## Що НЕ їде в Sentry
 *
 * Той самий принцип «нічого, крім дозволеного», що на бекенді, але вектори тут інші — головний це
 * **хлібні крихти**, тобто історія дій перед помилкою:
 *
 * - `console` **вимкнено**: крихта console-виклику несе ВСІ його аргументи. Зараз застосунок не
 *   логує нічого (перевірено: жодного `console.*` поза лендінгом), тож вимкнення не коштує нічого —
 *   зате закриває клас утечок, який інакше з'явився б із першим `console.log(note)` при налагодженні.
 * - `dom` **лишено**: перевірено в коді SDK — крихта записує СЕЛЕКТОР елемента (`htmlTreeAsString`),
 *   а не його значення. Тобто видно «натиснув кнопку збереження», але не те, що набрано в полі.
 *   Це найкорисніша частина історії, і вона безпечна.
 * - `fetch`/`xhr` лишено — URL і статус, без тіл. Query-рядки зрізає `beforeBreadcrumb` нижче.
 *
 * **Session Replay не підключено** і не має бути: він пише DOM, тобто щоденник на екрані —
 * рівно те, чого цей продукт не має віддавати назовні за жодних умов.
 *
 * **Трасування вимкнено** (`tracesSampleRate` не заданий) — як на бекенді.
 */

/** Зрізає `?...` з URL: у query зазвичай і з'являються токени, а помітити це постфактум неможливо. */
const stripQuery = (url: string): string => url.split("?")[0]!;

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    dataCollection: {
      // Ні email, ні IP, ні ідентифікатора: краще складніше зіставляти скарги з подіями, ніж
      // тримати профіль людини в третьому сервісі.
      userInfo: false,
      httpBodies: [],
      cookies: false,
      httpHeaders: { request: false, response: false },
      urlQueryParams: false,
      // Значення локальних змінних у кадрах стеку — на бекенді це головний вектор утечки
      // (текст нотатки, пароль); у браузері так само.
      stackFrameVariables: false,
    },
    integrations: [
      Sentry.breadcrumbsIntegration({
        console: false,
        dom: true,
        fetch: true,
        xhr: true,
        history: true,
        sentry: true,
      }),
    ],
    beforeBreadcrumb(breadcrumb) {
      const url = breadcrumb.data?.url;
      if (typeof url === "string") breadcrumb.data!.url = stripQuery(url);
      return breadcrumb;
    },
    beforeSend(event) {
      // `urlQueryParams: false` прибирає розібрані параметри, але сам `request.url` лишається
      // цілим разом із `?...` — перевірено на бекенді, поведінка та сама.
      if (event.request?.url) event.request.url = stripQuery(event.request.url);
      return event;
    },
  });
}

/**
 * Обробник помилок рендеру для React 19.
 *
 * Глобальні перехоплювачі SDK ловлять `window.onerror` і відхилені проміси, але помилку всередині
 * рендеру React обробляє сам і назовні не випускає — без цього хука вона лишилась би лише в
 * консолі браузера. Передається в `createRoot` як `onUncaughtError`.
 */
export const reactErrorHandler = Sentry.reactErrorHandler;
