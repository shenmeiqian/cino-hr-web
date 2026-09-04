import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import type { Employee, PermissionEvent } from '../api/types'

const ALL_SCOPES = ['wipe', 'outbound', 'erp', 'wms']

export default function Permissions() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [events, setEvents] = useState<PermissionEvent[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [scopes, setScopes] = useState<string[]>(['wipe', 'outbound'])
  const [reason, setReason] = useState('')
  const [trigger, setTrigger] = useState('normal')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const [e, p] = await Promise.all([
      api.get<Employee[]>('/api/v1/employees'),
      api.get<PermissionEvent[]>('/api/v1/permissions/events'),
    ])
    setEmployees(e.data)
    setEvents(p.data)
    if (!employeeId && e.data[0]) setEmployeeId(String(e.data[0].id))
  }

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err)))
  }, [])

  const empName = (id: number) => {
    const e = employees.find((x) => x.id === id)
    return e ? `${e.name}(${e.emp_no})` : String(id)
  }

  const toggleScope = (s: string) => {
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  const grant = async (ev: FormEvent) => {
    ev.preventDefault()
    setError('')
    setOk('')
    setBusy(true)
    try {
      const res = await api.post('/api/v1/permissions/grant', {
        employee_id: Number(employeeId),
        scopes,
        reason: reason || null,
        operator: 'web-admin',
      })
      setOk(`开权成功：事件 #${res.data.id}，状态 ${res.data.status}`)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const revoke = async () => {
    setError('')
    setOk('')
    setBusy(true)
    try {
      const res = await api.post('/api/v1/permissions/revoke', {
        employee_id: Number(employeeId),
        scopes,
        reason: reason || '停权',
        trigger,
        operator: 'web-admin',
      })
      setOk(`停权已提交：事件 #${res.data.id}，状态 ${res.data.status}，due_at=${res.data.due_at || '-'}`)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const selected = employees.find((e) => String(e.id) === employeeId)

  return (
    <div>
      {error && <div className="alert error">开权/停权错误：{error}</div>}
      {ok && <div className="alert success">{ok}</div>}

      <div className="panel">
        <h2>开权 / 停权</h2>
        <p style={{ color: '#8c8c8c', fontSize: 13, marginTop: 0 }}>
          介质接触岗申请 wipe/outbound 须完成 safety / sop / wipe_r2 且在有效期内，否则 API 返回 403 中文错误。
        </p>
        <form onSubmit={grant}>
          <div className="form-grid">
            <div className="field">
              <label>员工</label>
              <select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.emp_no}) {e.is_media_contact ? '[介质]' : ''} {e.is_critical_role ? '[关键]' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>停权触发 trigger</label>
              <select value={trigger} onChange={(e) => setTrigger(e.target.value)}>
                <option value="normal">normal</option>
                <option value="leave">leave</option>
                <option value="project_end">project_end</option>
                <option value="violation">violation</option>
              </select>
            </div>
            <div className="field">
              <label>原因</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="可选" />
            </div>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>scopes</label>
            <div className="scopes">
              {ALL_SCOPES.map((s) => (
                <label key={s}>
                  <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggleScope(s)} />
                  {s}
                </label>
              ))}
            </div>
          </div>
          {selected && (
            <div className="alert info" style={{ marginTop: 12 }}>
              当前员工：{selected.name} · 介质接触={String(selected.is_media_contact)} · 关键岗={String(selected.is_critical_role)} · 账号={selected.system_account_id || '-'}
            </div>
          )}
          <div className="toolbar" style={{ marginTop: 12 }}>
            <button className="btn" type="submit" disabled={busy || scopes.length === 0}>开权</button>
            <button className="btn danger" type="button" disabled={busy || scopes.length === 0 || !employeeId} onClick={revoke}>停权</button>
            <button className="btn secondary" type="button" onClick={() => load().catch((e) => setError(getErrorMessage(e)))}>刷新事件</button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h2>权限事件</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>员工</th>
              <th>类型</th>
              <th>scopes</th>
              <th>状态</th>
              <th>trigger</th>
              <th>due_at</th>
              <th>原因</th>
            </tr>
          </thead>
          <tbody>
            {events.map((x) => (
              <tr key={x.id}>
                <td>{x.id}</td>
                <td>{empName(x.employee_id)}</td>
                <td>{x.event_type}</td>
                <td>{x.scopes}</td>
                <td><span className="tag">{x.status}</span></td>
                <td>{x.trigger || '-'}</td>
                <td>{x.due_at || '-'}</td>
                <td>{x.reason || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && <div className="empty">暂无事件</div>}
      </div>
    </div>
  )
}
