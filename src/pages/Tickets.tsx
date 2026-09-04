import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import type { Employee, Ticket, WorkflowInstance } from '../api/types'
import { Perm } from '../components/Perm'
import { SubmitApprovalBtn, WorkflowStatus } from '../components/SubmitApproval'

export default function Tickets() {
  const [list, setList] = useState<Ticket[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [instMap, setInstMap] = useState<Record<number, WorkflowInstance | undefined>>({})
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    ticket_no: '', category: 'general', title: '', description: '',
    requester_emp_id: '', assignee_emp_id: '', priority: 'medium',
  })

  const load = async () => {
    const [t, e] = await Promise.all([
      api.get<Ticket[]>('/api/v1/tickets'),
      api.get<Employee[]>('/api/v1/employees'),
    ])
    setList(t.data); setEmployees(e.data)
    const map: Record<number, WorkflowInstance | undefined> = {}
    await Promise.all(t.data.map(async (row) => {
      const r = await api.get<WorkflowInstance[]>('/api/v1/workflows/instances', { params: { business_type: 'tickets', business_id: row.id } })
      map[row.id] = r.data[0]
    }))
    setInstMap(map)
  }

  useEffect(() => { load().catch((err) => setError(getErrorMessage(err))) }, [])

  const empName = (id?: number | null) => {
    if (!id) return '-'
    const e = employees.find((x) => x.id === id)
    return e ? `${e.name}(${e.emp_no})` : String(id)
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    try {
      await api.post('/api/v1/tickets', {
        ticket_no: form.ticket_no,
        category: form.category,
        title: form.title,
        description: form.description || null,
        requester_emp_id: form.requester_emp_id === '' ? null : Number(form.requester_emp_id),
        assignee_emp_id: form.assignee_emp_id === '' ? null : Number(form.assignee_emp_id),
        status: 'open',
        priority: form.priority,
      })
      setOk('工单已创建'); setOpen(false); await load()
    } catch (err) { setError(getErrorMessage(err)) }
  }

  return (
    <div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert success">{ok}</div>}
      <div className="panel">
        <div className="toolbar">
          <Perm code="btn.tickets.create">
            <button className="btn" onClick={() => { setOpen(true); setForm({ ...form, ticket_no: `TK-${Date.now().toString().slice(-6)}` }) }}>新建工单</button>
          </Perm>
          <button className="btn secondary" onClick={() => load()}>刷新</button>
        </div>
        <p className="muted">关闭工单请提交审批；在「待办审批」推进。</p>
        <table>
          <thead><tr><th>ID</th><th>单号</th><th>标题</th><th>状态</th><th>审批流</th><th>操作</th></tr></thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td><td>{row.ticket_no}</td><td>{row.title}</td>
                <td><span className={`tag ${row.status === 'closed' ? 'ok' : 'blue'}`}>{row.status}</span></td>
                <td><WorkflowStatus inst={instMap[row.id] || null} /></td>
                <td>
                  {!instMap[row.id] && row.status === 'open' && (
                    <SubmitApprovalBtn businessType="tickets" businessId={row.id} perm="btn.tickets.submit" onDone={() => { setOk('已提交审批'); load() }} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>新建人事工单</h3>
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field"><label>单号</label><input required value={form.ticket_no} onChange={(e) => setForm({ ...form, ticket_no: e.target.value })} /></div>
                <div className="field"><label>标题</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="field"><label>申请人</label>
                  <select value={form.requester_emp_id} onChange={(e) => setForm({ ...form, requester_emp_id: e.target.value })}>
                    <option value="">请选择</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
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
