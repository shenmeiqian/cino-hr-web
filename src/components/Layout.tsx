import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export type MenuNode = {
  id: number
  parent_id?: number | null
  title: string
  path?: string | null
  icon?: string | null
  sort_order: number
  permission_code: string
  visible: boolean
  children?: MenuNode[]
}

function pathActive(pathname: string, path?: string | null): boolean {
  if (!path) return false
  if (path === '/') return pathname === '/'
  return pathname === path || pathname.startsWith(path + '/')
}

function hasActiveDescendant(node: MenuNode, pathname: string): boolean {
  if (pathActive(pathname, node.path)) return true
  return (node.children || []).some((c) => hasActiveDescendant(c, pathname))
}

function NavNode({ node, depth = 0 }: { node: MenuNode; depth?: number }) {
  const loc = useLocation()
  const kids = node.children || []
  const isGroup = !node.path && kids.length > 0
  const activeHere = pathActive(loc.pathname, node.path)
  const childActive = hasActiveDescendant(node, loc.pathname)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (childActive) setOpen(true)
  }, [childActive])

  if (isGroup) {
    return (
      <div className="nav-group" style={{ marginLeft: depth ? 8 : 0 }}>
        <button
          type="button"
          className={`nav-group-title ${childActive ? 'active-group' : ''}`}
          onClick={() => setOpen((v) => !v)}
        >
          <span>{node.title}</span>
          <span className="nav-caret">{open ? '▾' : '▸'}</span>
        </button>
        {open && (
          <div className="nav-children">
            {kids.map((c) => (
              <NavNode key={c.id} node={c} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!node.path) return null

  return (
    <Link
      to={node.path}
      className={activeHere ? 'active' : ''}
      style={{ marginLeft: depth ? 8 : 0 }}
    >
      {node.title}
    </Link>
  )
}

export default function Layout({ title, children }: { title: string; children: ReactNode }) {
  const loc = useLocation()
  const nav = useNavigate()
  const { user, logout, permissions } = useAuth()
  const [menus, setMenus] = useState<MenuNode[]>([])

  useEffect(() => {
    api
      .get<MenuNode[]>('/api/v1/sys/menus/tree')
      .then((r) => setMenus(r.data || []))
      .catch(() => setMenus([]))
  }, [user, permissions])

  const flatTitle = useMemo(() => {
    const walk = (nodes: MenuNode[]): string | null => {
      for (const n of nodes) {
        if (n.path && pathActive(loc.pathname, n.path)) return n.title
        const t = walk(n.children || [])
        if (t) return t
      }
      return null
    }
    return walk(menus) || title
  }, [menus, loc.pathname, title])

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          CINO 人事管理
          <small>{user?.display_name || user?.username || '-'}</small>
        </div>
        <nav className="nav">
          {menus.map((m) => (
            <NavNode key={m.id} node={m} />
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="header">
          <h1>{flatTitle}</h1>
          <div className="meta" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span>{user?.username}</span>
            <button
              className="btn sm secondary"
              onClick={async () => {
                await logout()
                nav('/login')
              }}
            >
              退出
            </button>
          </div>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  )
}
