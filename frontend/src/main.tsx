import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import "@/app/styles/index.css";
import "@/shared/config/i18n";
import App from "@/app/App";
import { store } from "@/app/store";
import { I18nProvider, SessionProvider, ThemeProvider } from "@/app/providers";
import { Toaster } from "@/shared/ui";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <I18nProvider>
        <ThemeProvider>
          <SessionProvider>
            <App />
            <Toaster />
          </SessionProvider>
        </ThemeProvider>
      </I18nProvider>
    </Provider>
  </StrictMode>,
);
