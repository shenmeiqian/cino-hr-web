import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { api, setAuthToken, getStoredToken, clearAuthToken } from '../api/client'

export type AuthUser = {
  id: number
  username: string
  display_name: string
  employee_id?: number | null
  status: string
}

type AuthState = {
  ready: boolean
  token: string | null
  user: AuthUser | null
  roles: string[]
  permissions: Set<string>
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasPerm: (code: string) => boolean
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState<string | null>(getStoredToken())
  const [user, setUser] = useState<AuthUser | null>(null)
  const [roles, setRoles] = useState<string[]>([])
  const [permissions, setPermissions] = useState<Set<string>>(new Set())

  const applyMe = useCallback(async (tok: string) => {
    setAuthToken(tok)
    const res = await api.get('/api/v1/auth/me')
    const data = res.data
    setToken(tok)
    setUser(data.user)
    setRoles(data.roles || [])
    const perms: string[] = data.permissions || []
    setPermissions(new Set(perms.includes('*') ? ['*'] : perms))
  }, [])

  useEffect(() => {
    const boot = async () => {
      const params = new URLSearchParams(window.location.search)
      const ssoToken = params.get('token')
      if (ssoToken) {
        localStorage.setItem('cino_hr_token', ssoToken)
        window.history.replaceState({}, '', window.location.pathname)
        try {
          await applyMe(ssoToken)
        } catch {
          clearAuthToken()
          setToken(null)
        }
        setReady(true)
        return
      }
      const t = getStoredToken()
      if (!t) {
        setReady(true)
        return
      }
      try {
        await applyMe(t)
      } catch {
        clearAuthToken()
        setToken(null)
      }
      setReady(true)
    }
    boot()
  }, [applyMe])

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post('/api/v1/auth/login', { username, password })
    localStorage.setItem('cino_hr_token', res.data.token)
    await applyMe(res.data.token)
  }, [applyMe])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/v1/auth/logout')
    } catch {
      /* ignore */
    }
    clearAuthToken()
    setToken(null)
    setUser(null)
    setRoles([])
    setPermissions(new Set())
  }, [])

  const hasPerm = useCallback(
    (code: string) => permissions.has('*') || permissions.has(code),
    [permissions],
  )

  const value = useMemo(
    () => ({ ready, token, user, roles, permissions, login, logout, hasPerm }),
    [ready, token, user, roles, permissions, login, logout, hasPerm],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside provider')
  return v
}
