/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Базовий URL REST API (Express). Споживає `httpBaseQuery` (fetchBaseQuery). */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Версія з `package.json`, підставляється на збірці (`define` у vite.config.ts). */
declare const __APP_VERSION__: string;
