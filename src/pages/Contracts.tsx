import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import type { Contract, Employee, WorkflowInstance } from '../api/types'
import { Perm } from '../components/Perm'
import { SubmitApprovalBtn, WorkflowStatus } from '../components/SubmitApproval'

export default function Contracts() {
  const [list, setList] = useState<Contract[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [instMap, setInstMap] = useState<Record<number, WorkflowInstance | undefined>>({})
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    employee_id: '', contract_no: '', contract_type: 'fixed',
    start_date: new Date().toISOString().slice(0, 10), end_date: '', remark: '',
  })

  const load = async () => {
    const [c, e] = await Promise.all([
      api.get<Contract[]>('/api/v1/contracts'),
      api.get<Employee[]>('/api/v1/employees'),
    ])
    setList(c.data); setEmployees(e.data)
    const map: Record<number, WorkflowInstance | undefined> = {}
    await Promise.all(c.data.map(async (row) => {
      const r = await api.get<WorkflowInstance[]>('/api/v1/workflows/instances', { params: { business_type: 'contracts', business_id: row.id } })
      map[row.id] = r.data[0]
    }))
    setInstMap(map)
  }

  useEffect(() => { load().catch((err) => setError(getErrorMessage(err))) }, [])

  const empName = (id: number) => {
    const e = employees.find((x) => x.id === id)
    return e ? `${e.name}(${e.emp_no})` : String(id)
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    try {
      await api.post('/api/v1/contracts', {
        employee_id: Number(form.employee_id),
        contract_no: form.contract_no,
        contract_type: form.contract_type,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: 'pending',
        remark: form.remark || null,
      })
      setOk('合同已登记为 pending，请提交审批'); setOpen(false); await load()
    } catch (err) { setError(getErrorMessage(err)) }
  }

  return (
    <div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert success">{ok}</div>}
      <div className="panel">
        <div className="toolbar">
          <Perm code="btn.contracts.create">
            <button className="btn" onClick={() => { setOpen(true); setForm({ ...form, contract_no: `CT-${Date.now().toString().slice(-6)}` }) }}>登记合同</button>
          </Perm>
          <button className="btn secondary" onClick={() => load()}>刷新</button>
        </div>
        <p className="muted">合同生效/终止走审批流，无页面内通过/驳回。</p>
        <table>
          <thead><tr><th>ID</th><th>员工</th><th>合同号</th><th>类型</th><th>状态</th><th>审批流</th><th>操作</th></tr></thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td><td>{empName(row.employee_id)}</td><td>{row.contract_no}</td><td>{row.contract_type}</td>
                <td><span className={`tag ${row.status === 'active' ? 'ok' : row.status === 'rejected' ? 'bad' : 'warn'}`}>{row.status}</span></td>
                <td><WorkflowStatus inst={instMap[row.id] || null} /></td>
                <td>
                  {!instMap[row.id] && (row.status === 'pending' || row.status === 'active') && (
                    <SubmitApprovalBtn businessType="contracts" businessId={row.id} perm="btn.contracts.submit" onDone={() => { setOk('已提交审批'); load() }} />
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
            <h3>登记合同</h3>
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field"><label>员工</label>
                  <select required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                    <option value="">请选择</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div className="field"><label>合同号</label><input required value={form.contract_no} onChange={(e) => setForm({ ...form, contract_no: e.target.value })} /></div>
                <div className="field"><label>开始日</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
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
