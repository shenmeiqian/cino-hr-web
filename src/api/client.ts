import axios from 'axios'

const TOKEN_KEY = 'cino_hr_token'

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
  baseURL: 'http://127.0.0.1:8000',
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
      return `无法连接后端 ${api.defaults.baseURL}（${method} ${path}）。请确认 FastAPI 已启动（默认 http://127.0.0.1:8000）。`
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
