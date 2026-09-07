/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Empty = same origin (nginx proxies `/api/`). Local Vite defaults to http://127.0.0.1:8000. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
