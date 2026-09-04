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
