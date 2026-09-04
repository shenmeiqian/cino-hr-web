import { Link, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'

const menus = [
  { to: '/', label: '仪表盘' },
  { to: '/employees', label: '员工花名册' },
  { to: '/trainings', label: '培训' },
  { to: '/permissions', label: '权限' },
  { to: '/org', label: '编制/岗位' },
  { to: '/kpi', label: 'KPI 跑批' },
]

export default function Layout({ title, children }: { title: string; children: ReactNode }) {
  const loc = useLocation()
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          CINO 人事管理
          <small>HR Admin · demo-key</small>
        </div>
        <nav className="nav">
          {menus.map((m) => (
            <Link key={m.to} to={m.to} className={loc.pathname === m.to ? 'active' : ''}>
              {m.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="header">
          <h1>{title}</h1>
          <div className="meta">API http://127.0.0.1:8000 · 无需登录</div>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  )
}
