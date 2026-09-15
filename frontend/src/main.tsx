// Sentry — найперший імпорт, до застосунку й провайдерів: інакше помилки, що трапились під час
// їхньої ініціалізації, не будуть перехоплені. Лендінг (`src/landing/main.tsx`) цього не імпортує
// навмисно — див. коментар у `app/sentry.ts`.
import { initSentry, reactErrorHandler } from "@/app/sentry";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import "@/app/styles/index.css";
import "@/shared/config/i18n";
import App from "@/app/App";
import { store } from "@/app/store";
import {
  I18nProvider,
  PreferencesSync,
  SessionProvider,
  ThemeProvider,
} from "@/app/providers";
import { Toaster } from "@/shared/ui";

initSentry();

createRoot(document.getElementById("root")!, {
  // Помилки рендеру React обробляє сам і назовні не випускає — без цих хуків вони лишились би
  // тільки в консолі браузера. `onCaughtError` — те, що перехопив error boundary; `onUncaughtError` —
  // те, що не перехопив ніхто.
  onCaughtError: reactErrorHandler(),
  onUncaughtError: reactErrorHandler(),
}).render(
  <StrictMode>
    <Provider store={store}>
      <I18nProvider>
        <ThemeProvider>
          <SessionProvider>
            <PreferencesSync />
            <App />
            <Toaster />
          </SessionProvider>
        </ThemeProvider>
      </I18nProvider>
    </Provider>
  </StrictMode>,
);
