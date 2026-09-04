import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import type { EmergencyApproval, Employee, WorkflowInstance } from '../api/types'
import { Perm } from '../components/Perm'
import { SubmitApprovalBtn, WorkflowStatus } from '../components/SubmitApproval'

export default function Emergency() {
  const [list, setList] = useState<EmergencyApproval[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [instMap, setInstMap] = useState<Record<number, WorkflowInstance | undefined>>({})
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
    const map: Record<number, WorkflowInstance | undefined> = {}
    await Promise.all(
      em.data.map(async (row) => {
        const r = await api.get<WorkflowInstance[]>('/api/v1/workflows/instances', {
          params: { business_type: 'emergency', business_id: row.id },
        })
        map[row.id] = r.data[0]
      }),
    )
    setInstMap(map)
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
        status: 'pending',
        approver: null,
      })
      setOk('紧急用工单已创建，请提交审批')
      setOpen(false)
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
          <Perm code="btn.emergency.create">
            <button className="btn" onClick={() => { setOpen(true); setError(''); setForm({ ...form, approval_no: `EM-${Date.now().toString().slice(-6)}` }) }}>发起紧急用工</button>
          </Perm>
          <button className="btn secondary" onClick={() => load().catch((e) => setError(getErrorMessage(e)))}>刷新</button>
        </div>
        <p className="muted">审批请在「待办审批」处理，本页仅提交审批流。</p>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>审批号</th><th>员工</th><th>原因</th><th>状态</th><th>审批流</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.approval_no}</td>
                <td>{empName(row.employee_id)}</td>
                <td>{row.reason}</td>
                <td><span className={`tag ${row.status === 'approved' ? 'ok' : row.status === 'rejected' ? 'bad' : 'warn'}`}>{row.status}</span></td>
                <td><WorkflowStatus inst={instMap[row.id] || null} /></td>
                <td>
                  {!instMap[row.id] && row.status === 'pending' && (
                    <SubmitApprovalBtn
                      businessType="emergency"
                      businessId={row.id}
                      perm="btn.emergency.submit"
                      onDone={() => { setOk('已提交审批'); load() }}
                    />
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
            <h3>发起紧急用工</h3>
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field"><label>审批号</label><input required value={form.approval_no} onChange={(e) => setForm({ ...form, approval_no: e.target.value })} /></div>
                <div className="field">
                  <label>员工</label>
                  <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                    <option value="">可选</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.emp_no})</option>)}
                  </select>
                </div>
                <div className="field"><label>原因</label><input required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
                <div className="field"><label>权限范围</label><input value={form.scopes} onChange={(e) => setForm({ ...form, scopes: e.target.value })} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setOpen(false)}>取消</button>
                <button type="submit" className="btn">创建</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
