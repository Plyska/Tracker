/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Базовий URL REST API (Express). Споживає `httpBaseQuery` (fetchBaseQuery). */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
