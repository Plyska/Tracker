import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import "@/app/styles/index.css";
import "@/shared/config/i18n";
import App from "@/app/App";
import { store } from "@/app/store";
import { I18nProvider, ThemeProvider } from "@/app/providers";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <I18nProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </I18nProvider>
    </Provider>
  </StrictMode>,
);
