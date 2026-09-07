import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { useAuth } from './auth/AuthContext'
import Login from './pages/Login'
import NoAccess from './pages/NoAccess'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Trainings from './pages/Trainings'
import Permissions from './pages/Permissions'
import Org from './pages/Org'
import Kpi from './pages/Kpi'
import Integration from './pages/Integration'
import IntegrationGuide from './pages/IntegrationGuide'
import Principles from './pages/Principles'
import Recruiting from './pages/Recruiting'
import Onboarding from './pages/Onboarding'
import Contracts from './pages/Contracts'
import Attendance from './pages/Attendance'
import Evidences from './pages/Evidences'
import Tickets from './pages/Tickets'
import Emergency from './pages/Emergency'
import Workflows from './pages/Workflows'
import Todos from './pages/Todos'
import Files from './pages/Files'
import Notifications from './pages/Notifications'
import SysUsers from './pages/sys/Users'
import SysRoles from './pages/sys/Roles'
import SysPermissions from './pages/sys/Permissions'
import SysMenus from './pages/sys/Menus'
import { ReactElement } from 'react'

const titles: Record<string, string> = {
  '/': '仪表盘',
  '/todos': '待办审批',
  '/principles': '原则说明',
  '/employees': '员工花名册',
  '/trainings': '培训管理',
  '/permissions': '开权审计日志',
  '/org': '编制与岗位',
  '/kpi': '人事KPI看板',
  '/integration': '对接中心',
  '/integration-guide': '对接说明',
  '/recruiting': '招聘入职闭环',
  '/onboarding': '入职单',
  '/contracts': '合同社保',
  '/attendance': '考勤异常',
  '/evidences': 'R2/ISO 证据',
  '/tickets': '人事工单',
  '/emergency': '紧急用工',
  '/workflows': '审批流设计',
  '/files': '文件管理',
  '/notifications': '通知日志',
  '/sys/users': '用户管理',
  '/sys/roles': '角色管理',
  '/sys/permissions': '权限目录',
  '/sys/menus': '菜单配置',
}

const menuPerm: Record<string, string> = {
  '/': 'menu.dashboard',
  '/todos': 'menu.todos',
  '/principles': 'menu.principles',
  '/employees': 'menu.employees',
  '/trainings': 'menu.trainings',
  '/permissions': 'menu.permissions',
  '/org': 'menu.org',
  '/kpi': 'menu.kpi',
  '/integration': 'menu.integration',
  '/integration-guide': 'menu.integration.guide',
  '/recruiting': 'menu.recruiting',
  '/onboarding': 'menu.onboarding',
  '/contracts': 'menu.contracts',
  '/attendance': 'menu.attendance',
  '/evidences': 'menu.evidences',
  '/tickets': 'menu.tickets',
  '/emergency': 'menu.emergency',
  '/workflows': 'menu.workflows',
  '/files': 'menu.files',
  '/notifications': 'menu.notifications',
  '/sys/users': 'menu.sys.users',
  '/sys/roles': 'menu.sys.roles',
  '/sys/permissions': 'menu.sys.permissions',
  '/sys/menus': 'menu.sys.menus',
}

function Guard({ path, el }: { path: string; el: ReactElement }) {
  const { hasPerm } = useAuth()
  const code = menuPerm[path]
  if (code && !hasPerm(code)) return <NoAccess />
  return el
}

export default function App() {
  const loc = useLocation()
  const { ready, token } = useAuth()
  const title = titles[loc.pathname] || 'CINO 人事管理'

  if (!ready) return <div className="login-page">加载中…</div>
  if (!token && loc.pathname !== '/login') return <Navigate to="/login" replace />
  if (token && loc.pathname === '/login') return <Navigate to="/" replace />

  if (loc.pathname === '/login') return <Login />

  return (
    <Layout title={title}>
      <Routes>
        <Route path="/" element={<Guard path="/" el={<Dashboard />} />} />
        <Route path="/todos" element={<Guard path="/todos" el={<Todos />} />} />
        <Route path="/principles" element={<Guard path="/principles" el={<Principles />} />} />
        <Route path="/employees" element={<Guard path="/employees" el={<Employees />} />} />
        <Route path="/trainings" element={<Guard path="/trainings" el={<Trainings />} />} />
        <Route path="/permissions" element={<Guard path="/permissions" el={<Permissions />} />} />
        <Route path="/org" element={<Guard path="/org" el={<Org />} />} />
        <Route path="/kpi" element={<Guard path="/kpi" el={<Kpi />} />} />
        <Route path="/integration" element={<Guard path="/integration" el={<Integration />} />} />
        <Route path="/integration-guide" element={<Guard path="/integration-guide" el={<IntegrationGuide />} />} />
        <Route path="/recruiting" element={<Guard path="/recruiting" el={<Recruiting />} />} />
        <Route path="/onboarding" element={<Guard path="/onboarding" el={<Onboarding />} />} />
        <Route path="/contracts" element={<Guard path="/contracts" el={<Contracts />} />} />
        <Route path="/attendance" element={<Guard path="/attendance" el={<Attendance />} />} />
        <Route path="/evidences" element={<Guard path="/evidences" el={<Evidences />} />} />
        <Route path="/tickets" element={<Guard path="/tickets" el={<Tickets />} />} />
        <Route path="/emergency" element={<Guard path="/emergency" el={<Emergency />} />} />
        <Route path="/workflows" element={<Guard path="/workflows" el={<Workflows />} />} />
        <Route path="/files" element={<Guard path="/files" el={<Files />} />} />
        <Route path="/notifications" element={<Guard path="/notifications" el={<Notifications />} />} />
        <Route path="/sys/users" element={<Guard path="/sys/users" el={<SysUsers />} />} />
        <Route path="/sys/roles" element={<Guard path="/sys/roles" el={<SysRoles />} />} />
        <Route path="/sys/permissions" element={<Guard path="/sys/permissions" el={<SysPermissions />} />} />
        <Route path="/sys/menus" element={<Guard path="/sys/menus" el={<SysMenus />} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
