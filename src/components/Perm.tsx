import { ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'

/** Hide children unless user has button/menu permission. */
export function Perm({ code, children }: { code: string; children: ReactNode }) {
  const { hasPerm } = useAuth()
  if (!hasPerm(code)) return null
  return <>{children}</>
}
