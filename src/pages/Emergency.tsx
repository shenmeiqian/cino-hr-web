import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import type { EmergencyApproval, Employee } from '../api/types'

export default function Emergency() {
  const [list, setList] = useState<EmergencyApproval[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    approval_no: '',
    employee_id: '',
    reason: '',
    scopes: 'temp_access',
    status: 'pending',
    approver: '',
  })

  const load = async () => {
    const [em, e] = await Promise.all([
      api.get<EmergencyApproval[]>('/api/v1/emergency-approvals'),
      api.get<Employee[]>('/api/v1/employees'),
    ])
    setList(em.data)
    setEmployees(e.data)
    if (em.data.length === 0 && e.data[0]) {
      await api.post('/api/v1/emergency-approvals', {
        approval_no: `EM-${Date.now().toString().slice(-6)}`,
        employee_id: e.data.find((x) => x.emp_no === 'E3001')?.id ?? e.data[0].id,
        reason: '旺季临时补岗（演示）',
        scopes: 'temp_access,site_entry',
        status: 'pending',
      })
      const again = await api.get<EmergencyApproval[]>('/api/v1/emergency-approvals')
      setList(again.data)
    }
  }

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err)))
  }, [])

  const empName = (id?: number | null) => {
    if (!id) return '-'
    const e = employees.find((x) => x.id === id)
    return e ? `${e.name}(${e.emp_no})` : String(id)
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    setError('')
    setOk('')
    try {
      await api.post('/api/v1/emergency-approvals', {
        approval_no: form.approval_no,
        employee_id: form.employee_id === '' ? null : Number(form.employee_id),
        reason: form.reason,
        scopes: form.scopes || null,
        status: form.status,
        approver: form.approver || null,
      })
      setOk('紧急用工审批已提交')
      setOpen(false)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const decide = async (row: EmergencyApproval, status: 'approved' | 'rejected') => {
    try {
      await api.patch(`/api/v1/emergency-approvals/${row.id}`, {
        status,
        approver: '王人事',
      })
      setOk(`审批 #${row.id} 已${status === 'approved' ? '通过' : '驳回'}`)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert success">{ok}</div>}
      <div className="panel">
        <div className="toolbar">
          <button className="btn" onClick={() => { setOpen(true); setError(''); setForm({ ...form, approval_no: `EM-${Date.now().toString().slice(-6)}` }) }}>发起紧急用工</button>
          <button className="btn secondary" onClick={() => load().catch((e) => setError(getErrorMessage(e)))}>刷新</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>审批号</th>
              <th>员工</th>
              <th>原因</th>
              <th>范围</th>
              <th>状态</th>
              <th>审批人</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.approval_no}</td>
                <td>{empName(row.employee_id)}</td>
                <td>{row.reason}</td>
                <td>{row.scopes || '-'}</td>
                <td>
                  <span className={`tag ${row.status === 'approved' ? 'ok' : row.status === 'rejected' ? 'bad' : 'warn'}`}>
                    {row.status}
                  </span>
                </td>
                <td>{row.approver || '-'}</td>
                <td>
                  {row.status === 'pending' && (
                    <>
                      <button className="btn sm" onClick={() => decide(row, 'approved')}>通过</button>{' '}
                      <button className="btn sm danger" onClick={() => decide(row, 'rejected')}>驳回</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty">暂无紧急审批</div>}
      </div>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>发起紧急用工审批</h3>
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field">
                  <label>审批号</label>
                  <input required value={form.approval_no} onChange={(e) => setForm({ ...form, approval_no: e.target.value })} />
                </div>
                <div className="field">
                  <label>员工</label>
                  <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                    <option value="">可选</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.emp_no})</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>原因</label>
                  <input required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                </div>
                <div className="field">
                  <label>权限范围</label>
                  <input value={form.scopes} onChange={(e) => setForm({ ...form, scopes: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setOpen(false)}>取消</button>
                <button type="submit" className="btn">提交</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
