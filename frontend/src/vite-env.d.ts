/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Базовий URL API (Фаза 9: мок-baseQuery ігнорує; backend-фаза: fetchBaseQuery). */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
