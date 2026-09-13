import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Лендінг — окремий легкий entry (landing.html → src/landing). Він ділить із застосунком лише
    // токени й примітиви shared/ui; router/redux/i18next/RTK Query і верхні шари FSD сюди не
    // імпортуються, інакше анонімний відвідувач знову тягне мегабайт JS.
    files: ["src/landing/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react-router*",
                "@reduxjs/*",
                "react-redux",
                "i18next",
                "react-i18next",
                "recharts",
                "@tiptap/*",
                "date-fns",
                "date-fns/*",
                "@/app/*",
                "@/pages/*",
                "@/widgets/*",
                "@/features/*",
                "@/entities/*",
                "@/shared/api",
                "@/shared/api/*",
                "@/shared/config/i18n",
                "@/shared/config/i18n/*",
              ],
              message:
                "Лендінг — окремий легкий entry: лише shared/ui, shared/lib/cn, shared/config/paths і токени.",
            },
          ],
        },
      ],
    },
  },
]);
