import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import type { Employee, Onboarding as OnboardingRow, WorkflowInstance } from '../api/types'
import { Perm } from '../components/Perm'
import { SubmitApprovalBtn, WorkflowStatus } from '../components/SubmitApproval'

export default function Onboarding() {
  const [list, setList] = useState<OnboardingRow[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [instMap, setInstMap] = useState<Record<number, WorkflowInstance | undefined>>({})
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    employee_id: '',
    plan_start: new Date().toISOString().slice(0, 10),
    actual_start: '',
    buddy_emp_id: '',
    checklist_status: 'pending',
    account_bound: false,
    remark: '',
  })

  const load = async () => {
    const [o, e] = await Promise.all([
      api.get<OnboardingRow[]>('/api/v1/onboarding'),
      api.get<Employee[]>('/api/v1/employees'),
    ])
    setList(o.data)
    setEmployees(e.data)
    const map: Record<number, WorkflowInstance | undefined> = {}
    await Promise.all(
      o.data.map(async (row) => {
        const r = await api.get<WorkflowInstance[]>('/api/v1/workflows/instances', {
          params: { business_type: 'onboarding', business_id: row.id },
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
    try {
      await api.post('/api/v1/onboarding', {
        employee_id: Number(form.employee_id),
        plan_start: form.plan_start || null,
        actual_start: form.actual_start || null,
        buddy_emp_id: form.buddy_emp_id === '' ? null : Number(form.buddy_emp_id),
        checklist_status: 'pending',
        account_bound: false,
        remark: form.remark || null,
      })
      setOk('入职单已创建，请提交审批')
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
          <Perm code="btn.onboarding.create">
            <button className="btn" onClick={() => { setOpen(true); setError('') }}>新建入职单</button>
          </Perm>
          <button className="btn secondary" onClick={() => load().catch((e) => setError(getErrorMessage(e)))}>刷新</button>
        </div>
        <p className="muted">审批通过后自动将清单置为 done；请在「待办审批」同意/驳回。</p>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>员工</th><th>计划入职</th><th>Buddy</th><th>清单</th><th>审批流</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{empName(row.employee_id)}</td>
                <td>{row.plan_start || '-'}</td>
                <td>{empName(row.buddy_emp_id)}</td>
                <td><span className={`tag ${row.checklist_status === 'done' ? 'ok' : 'warn'}`}>{row.checklist_status}</span></td>
                <td><WorkflowStatus inst={instMap[row.id] || null} /></td>
                <td>
                  {!instMap[row.id] && row.checklist_status === 'pending' && (
                    <SubmitApprovalBtn businessType="onboarding" businessId={row.id} perm="btn.onboarding.submit" onDone={() => { setOk('已提交审批'); load() }} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty">暂无入职单</div>}
      </div>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>新建入职单</h3>
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field">
                  <label>员工</label>
                  <select required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                    <option value="">请选择</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.emp_no})</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Buddy</label>
                  <select value={form.buddy_emp_id} onChange={(e) => setForm({ ...form, buddy_emp_id: e.target.value })}>
                    <option value="">请选择</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.emp_no})</option>)}
                  </select>
                </div>
                <div className="field"><label>计划入职日</label><input type="date" value={form.plan_start} onChange={(e) => setForm({ ...form, plan_start: e.target.value })} /></div>
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
