import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Trainings from './pages/Trainings'
import Permissions from './pages/Permissions'
import Org from './pages/Org'
import Kpi from './pages/Kpi'

const titles: Record<string, string> = {
  '/': '仪表盘',
  '/employees': '员工花名册',
  '/trainings': '培训管理',
  '/permissions': '权限开权/停权',
  '/org': '编制与岗位',
  '/kpi': '人事 KPI',
}

export default function App() {
  const loc = useLocation()
  const title = titles[loc.pathname] || 'CINO 人事管理'
  return (
    <Layout title={title}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/trainings" element={<Trainings />} />
        <Route path="/permissions" element={<Permissions />} />
        <Route path="/org" element={<Org />} />
        <Route path="/kpi" element={<Kpi />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
