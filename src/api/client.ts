import axios from 'axios'

const TOKEN_KEY = 'cino_hr_token'

/** Same-origin when empty (Docker/nginx `/api/` proxy). Local Vite defaults to the API on :8000. */
function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL
  if (fromEnv !== undefined) {
    return String(fromEnv).replace(/\/$/, '')
  }
  return import.meta.env.DEV ? 'http://127.0.0.1:8000' : ''
}

export const API_BASE_URL = resolveApiBaseUrl()

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
  api.defaults.headers.common.Authorization = `Bearer ${token}`
  delete api.defaults.headers.common['X-API-Key']
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY)
  delete api.defaults.headers.common.Authorization
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const existing = getStoredToken()
if (existing) {
  api.defaults.headers.common.Authorization = `Bearer ${existing}`
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      const path = window.location.pathname
      if (path !== '/login') {
        localStorage.removeItem(TOKEN_KEY)
      }
    }
    return Promise.reject(err)
  },
)

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data?.detail
    if (typeof d === 'string') return d
    if (Array.isArray(d)) return d.map((x) => x.msg || JSON.stringify(x)).join('; ')
    if (d && typeof d === 'object') return JSON.stringify(d)
    return err.message
  }
  return String(err)
}

/** 404 / 405 / 501 — backend route not implemented yet. */
export function isMissingApi(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false
  const s = err.response?.status
  return s === 404 || s === 405 || s === 501
}

/** User-facing error that names the method+path when the V2.2 API is not ready. */
export function describeRequestError(err: unknown, method: string, path: string): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      const base = api.defaults.baseURL || '同源 /api（nginx 反代）'
      return `无法连接后端 ${base}（${method} ${path}）。请确认 FastAPI 已启动（本地默认 http://127.0.0.1:8000）。`
    }
    if (isMissingApi(err)) {
      const detail = getErrorMessage(err)
      return `接口尚未就绪：${method} ${path}（HTTP ${err.response.status}）。页面已按约定路径调用，后端补齐后即可使用。${detail ? ` 详情：${detail}` : ''}`
    }
    return getErrorMessage(err)
  }
  return String(err)
}

export function unwrapList<T = unknown>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    for (const k of ['items', 'data', 'results', 'users', 'revokes', 'callbacks', 'logs', 'flags', 'scores']) {
      if (Array.isArray(o[k])) return o[k] as T[]
    }
  }
  return []
}
