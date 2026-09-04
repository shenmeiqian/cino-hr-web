import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import type { Department, Employee, Position, RecruitingReq, WorkflowInstance } from '../api/types'
import { Perm } from '../components/Perm'
import { SubmitApprovalBtn, WorkflowStatus } from '../components/SubmitApproval'

export default function Recruiting() {
  const [list, setList] = useState<RecruitingReq[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [instMap, setInstMap] = useState<Record<number, WorkflowInstance | undefined>>({})
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    req_no: '', position_id: '', dept_id: '', headcount: '1', owner_emp_id: '',
    open_date: new Date().toISOString().slice(0, 10), remark: '',
  })

  const load = async () => {
    const [r, e, p, d] = await Promise.all([
      api.get<RecruitingReq[]>('/api/v1/recruiting'),
      api.get<Employee[]>('/api/v1/employees'),
      api.get<Position[]>('/api/v1/positions'),
      api.get<Department[]>('/api/v1/departments'),
    ])
    setList(r.data); setEmployees(e.data); setPositions(p.data); setDepts(d.data)
    const map: Record<number, WorkflowInstance | undefined> = {}
    await Promise.all(r.data.map(async (row) => {
      const res = await api.get<WorkflowInstance[]>('/api/v1/workflows/instances', { params: { business_type: 'recruiting', business_id: row.id } })
      map[row.id] = res.data[0]
    }))
    setInstMap(map)
  }

  useEffect(() => { load().catch((err) => setError(getErrorMessage(err))) }, [])

  const posName = (id?: number | null) => positions.find((p) => p.id === id)?.title || '-'
  const deptName = (id?: number | null) => depts.find((d) => d.id === id)?.name || '-'
  const empName = (id?: number | null) => {
    if (!id) return '-'
    const e = employees.find((x) => x.id === id)
    return e ? `${e.name}(${e.emp_no})` : String(id)
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    try {
      await api.post('/api/v1/recruiting', {
        req_no: form.req_no,
        position_id: form.position_id === '' ? null : Number(form.position_id),
        dept_id: form.dept_id === '' ? null : Number(form.dept_id),
        headcount: Number(form.headcount) || 1,
        status: 'open',
        owner_emp_id: form.owner_emp_id === '' ? null : Number(form.owner_emp_id),
        open_date: form.open_date || null,
        remark: form.remark || null,
      })
      setOk('招聘需求已创建'); setOpen(false); await load()
    } catch (err) { setError(getErrorMessage(err)) }
  }

  return (
    <div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert success">{ok}</div>}
      <div className="panel">
        <div className="toolbar">
          <Perm code="btn.recruiting.create">
            <button className="btn" onClick={() => { setOpen(true); setForm({ ...form, req_no: `REQ-${Date.now().toString().slice(-6)}` }) }}>新建需求</button>
          </Perm>
          <button className="btn secondary" onClick={() => load()}>刷新</button>
        </div>
        <p className="muted">关闭需求须走审批流；通过后状态变为 closed。</p>
        <table>
          <thead><tr><th>ID</th><th>需求号</th><th>岗位</th><th>部门</th><th>状态</th><th>审批流</th><th>操作</th></tr></thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td><td>{row.req_no}</td><td>{posName(row.position_id)}</td><td>{deptName(row.dept_id)}</td>
                <td><span className={`tag ${row.status === 'closed' ? 'ok' : 'blue'}`}>{row.status}</span></td>
                <td><WorkflowStatus inst={instMap[row.id] || null} /></td>
                <td>
                  {!instMap[row.id] && row.status === 'open' && (
                    <SubmitApprovalBtn businessType="recruiting" businessId={row.id} perm="btn.recruiting.submit" onDone={() => { setOk('已提交审批'); load() }} />
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
            <h3>新建招聘需求</h3>
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field"><label>需求号</label><input required value={form.req_no} onChange={(e) => setForm({ ...form, req_no: e.target.value })} /></div>
                <div className="field"><label>岗位</label>
                  <select value={form.position_id} onChange={(e) => setForm({ ...form, position_id: e.target.value })}>
                    <option value="">请选择</option>
                    {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div className="field"><label>部门</label>
                  <select value={form.dept_id} onChange={(e) => setForm({ ...form, dept_id: e.target.value })}>
                    <option value="">请选择</option>
                    {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="field"><label>负责人</label>
                  <select value={form.owner_emp_id} onChange={(e) => setForm({ ...form, owner_emp_id: e.target.value })}>
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
