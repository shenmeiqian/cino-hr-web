import { useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import type { AttendanceException, Employee, PermissionEvent } from '../api/types'

export default function Dashboard() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendance, setAttendance] = useState<AttendanceException[]>([])
  const [events, setEvents] = useState<PermissionEvent[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const [e, a, p] = await Promise.all([
          api.get<Employee[]>('/api/v1/employees'),
          api.get<AttendanceException[]>('/api/v1/attendance-exceptions'),
          api.get<PermissionEvent[]>('/api/v1/permissions/events'),
        ])
        setEmployees(e.data)
        setAttendance(a.data)
        setEvents(p.data)
      } catch (err) {
        setError(getErrorMessage(err))
      }
    })()
  }, [])

  const critical = employees.filter((x) => x.is_critical_role).length
  const openAtt = attendance.filter((x) => x.status === 'open' || x.status === 'pending').length
  const failedGrants = events
    .filter((x) => x.event_type === 'grant' && (x.status === 'failed' || x.status === 'denied' || x.status === 'rejected'))
    .slice(0, 5)
  // Also show recent grant events that might indicate issues; if none failed, show latest grants note
  const recentGrants = events.filter((x) => x.event_type === 'grant').slice(0, 8)

  return (
    <div>
      {error && <div className="alert error">{error}</div>}
      <div className="cards">
        <div className="card">
          <div className="label">员工数</div>
          <div className="value">{employees.length}</div>
          <div className="hint">在册合计（含全部状态）</div>
        </div>
        <div className="card">
          <div className="label">关键岗</div>
          <div className="value">{critical}</div>
          <div className="hint">is_critical_role = true</div>
        </div>
        <div className="card">
          <div className="label">待闭环考勤</div>
          <div className="value">{openAtt}</div>
          <div className="hint">status = open/pending</div>
        </div>
        <div className="card">
          <div className="label">开权事件</div>
          <div className="value">{recentGrants.length}</div>
          <div className="hint">最近开权记录数（展示区）</div>
        </div>
      </div>

      <div className="panel">
        <h2>最近开权 / 失败提示</h2>
        {failedGrants.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>员工ID</th>
                <th>scopes</th>
                <th>状态</th>
                <th>原因</th>
              </tr>
            </thead>
            <tbody>
              {failedGrants.map((x) => (
                <tr key={x.id}>
                  <td>{x.id}</td>
                  <td>{x.employee_id}</td>
                  <td>{x.scopes}</td>
                  <td><span className="tag bad">{x.status}</span></td>
                  <td>{x.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <>
            <div className="alert info">
              当前无已落库的「开权失败」事件。培训闸门失败通常以 HTTP 403 中文错误直接返回（不会写成功事件）。可在「权限」页试用无培训员工开权查看。
            </div>
            {recentGrants.length === 0 ? (
              <div className="empty">暂无开权事件</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>员工ID</th>
                    <th>scopes</th>
                    <th>状态</th>
                    <th>时间</th>
                  </tr>
                </thead>
                <tbody>
                  {recentGrants.map((x) => (
                    <tr key={x.id}>
                      <td>{x.id}</td>
                      <td>{x.employee_id}</td>
                      <td>{x.scopes}</td>
                      <td><span className="tag blue">{x.status}</span></td>
                      <td>{x.created_at || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  )
}
