import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Trainings from './pages/Trainings'
import Permissions from './pages/Permissions'
import Org from './pages/Org'
import Kpi from './pages/Kpi'
import Principles from './pages/Principles'
import Recruiting from './pages/Recruiting'
import Onboarding from './pages/Onboarding'
import Contracts from './pages/Contracts'
import Attendance from './pages/Attendance'
import Evidences from './pages/Evidences'
import Tickets from './pages/Tickets'
import Emergency from './pages/Emergency'
import Workflows from './pages/Workflows'

const titles: Record<string, string> = {
  '/': '仪表盘',
  '/principles': '原则说明',
  '/employees': '员工花名册',
  '/trainings': '培训管理',
  '/permissions': '权限开权/停权',
  '/org': '编制与岗位',
  '/kpi': '人事 KPI',
  '/recruiting': '招聘闭环',
  '/onboarding': '入职单',
  '/contracts': '合同社保',
  '/attendance': '考勤异常',
  '/evidences': 'R2/ISO 证据',
  '/tickets': '人事工单',
  '/emergency': '紧急用工',
  '/workflows': '工作审批流',
}

export default function App() {
  const loc = useLocation()
  const title = titles[loc.pathname] || 'CINO 人事管理'
  return (
    <Layout title={title}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/principles" element={<Principles />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/trainings" element={<Trainings />} />
        <Route path="/permissions" element={<Permissions />} />
        <Route path="/org" element={<Org />} />
        <Route path="/kpi" element={<Kpi />} />
        <Route path="/recruiting" element={<Recruiting />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/evidences" element={<Evidences />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/emergency" element={<Emergency />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
