import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import type { Employee, Ticket } from '../api/types'

export default function Tickets() {
  const [list, setList] = useState<Ticket[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    ticket_no: '',
    category: 'general',
    title: '',
    description: '',
    requester_emp_id: '',
    assignee_emp_id: '',
    status: 'open',
    priority: 'medium',
  })

  const load = async () => {
    const [t, e] = await Promise.all([
      api.get<Ticket[]>('/api/v1/tickets'),
      api.get<Employee[]>('/api/v1/employees'),
    ])
    setList(t.data)
    setEmployees(e.data)
    if (t.data.length === 0) {
      const hr = e.data.find((x) => x.emp_no === 'E2001')
      await api.post('/api/v1/tickets', {
        ticket_no: `TK-${Date.now().toString().slice(-6)}`,
        category: 'onboarding',
        title: '新员工账号开通（演示）',
        description: '请协助开通系统账号并绑定花名册',
        requester_emp_id: e.data[0]?.id,
        assignee_emp_id: hr?.id,
        status: 'open',
        priority: 'medium',
      })
      const again = await api.get<Ticket[]>('/api/v1/tickets')
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
      await api.post('/api/v1/tickets', {
        ticket_no: form.ticket_no,
        category: form.category,
        title: form.title,
        description: form.description || null,
        requester_emp_id: form.requester_emp_id === '' ? null : Number(form.requester_emp_id),
        assignee_emp_id: form.assignee_emp_id === '' ? null : Number(form.assignee_emp_id),
        status: form.status,
        priority: form.priority,
      })
      setOk('工单已创建')
      setOpen(false)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const closeTicket = async (row: Ticket) => {
    try {
      await api.patch(`/api/v1/tickets/${row.id}`, { status: 'closed' })
      setOk(`工单 #${row.id} 已关闭`)
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
          <button className="btn" onClick={() => { setOpen(true); setError(''); setForm({ ...form, ticket_no: `TK-${Date.now().toString().slice(-6)}` }) }}>新建工单</button>
          <button className="btn secondary" onClick={() => load().catch((e) => setError(getErrorMessage(e)))}>刷新</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>单号</th>
              <th>标题</th>
              <th>分类</th>
              <th>优先级</th>
              <th>申请人</th>
              <th>处理人</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.ticket_no}</td>
                <td>{row.title}</td>
                <td>{row.category}</td>
                <td>{row.priority}</td>
                <td>{empName(row.requester_emp_id)}</td>
                <td>{empName(row.assignee_emp_id)}</td>
                <td><span className={`tag ${row.status === 'closed' ? 'ok' : row.status === 'open' ? 'blue' : 'warn'}`}>{row.status}</span></td>
                <td>
                  {row.status !== 'closed' && (
                    <button className="btn sm" onClick={() => closeTicket(row)}>关闭</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty">暂无工单</div>}
      </div>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>新建人事工单</h3>
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field">
                  <label>单号</label>
                  <input required value={form.ticket_no} onChange={(e) => setForm({ ...form, ticket_no: e.target.value })} />
                </div>
                <div className="field">
                  <label>标题</label>
                  <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="field">
                  <label>分类</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="general">general</option>
                    <option value="onboarding">onboarding</option>
                    <option value="permission">permission</option>
                    <option value="payroll">payroll</option>
                  </select>
                </div>
                <div className="field">
                  <label>优先级</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </div>
                <div className="field">
                  <label>申请人</label>
                  <select value={form.requester_emp_id} onChange={(e) => setForm({ ...form, requester_emp_id: e.target.value })}>
                    <option value="">请选择</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.emp_no})</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>处理人</label>
                  <select value={form.assignee_emp_id} onChange={(e) => setForm({ ...form, assignee_emp_id: e.target.value })}>
                    <option value="">请选择</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.emp_no})</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>描述</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
