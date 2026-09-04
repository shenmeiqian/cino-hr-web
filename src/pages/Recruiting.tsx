import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import type { Department, Employee, Position, RecruitingReq } from '../api/types'

export default function Recruiting() {
  const [list, setList] = useState<RecruitingReq[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    req_no: '',
    position_id: '',
    dept_id: '',
    headcount: '1',
    status: 'open',
    owner_emp_id: '',
    open_date: new Date().toISOString().slice(0, 10),
    remark: '',
  })

  const load = async () => {
    const [r, e, p, d] = await Promise.all([
      api.get<RecruitingReq[]>('/api/v1/recruiting'),
      api.get<Employee[]>('/api/v1/employees'),
      api.get<Position[]>('/api/v1/positions'),
      api.get<Department[]>('/api/v1/departments'),
    ])
    setList(r.data)
    setEmployees(e.data)
    setPositions(p.data)
    setDepts(d.data)
    if (r.data.length === 0 && p.data[0]) {
      await api.post('/api/v1/recruiting', {
        req_no: `REQ-${Date.now().toString().slice(-6)}`,
        position_id: p.data[0].id,
        dept_id: p.data[0].dept_id,
        headcount: 1,
        status: 'open',
        owner_emp_id: e.data.find((x) => x.emp_no === 'E2001')?.id ?? e.data[0]?.id,
        open_date: new Date().toISOString().slice(0, 10),
        remark: '演示招聘需求',
      })
      const again = await api.get<RecruitingReq[]>('/api/v1/recruiting')
      setList(again.data)
    }
  }

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err)))
  }, [])

  const posName = (id?: number | null) => positions.find((p) => p.id === id)?.title || '-'
  const deptName = (id?: number | null) => depts.find((d) => d.id === id)?.name || '-'
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
      await api.post('/api/v1/recruiting', {
        req_no: form.req_no,
        position_id: form.position_id === '' ? null : Number(form.position_id),
        dept_id: form.dept_id === '' ? null : Number(form.dept_id),
        headcount: Number(form.headcount) || 1,
        status: form.status,
        owner_emp_id: form.owner_emp_id === '' ? null : Number(form.owner_emp_id),
        open_date: form.open_date || null,
        remark: form.remark || null,
      })
      setOk('招聘需求已创建')
      setOpen(false)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const closeReq = async (row: RecruitingReq) => {
    try {
      await api.patch(`/api/v1/recruiting/${row.id}`, {
        status: 'closed',
        close_date: new Date().toISOString().slice(0, 10),
      })
      setOk(`已关闭需求 #${row.id}`)
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
          <button className="btn" onClick={() => { setOpen(true); setError(''); setForm({ ...form, req_no: `REQ-${Date.now().toString().slice(-6)}` }) }}>新建需求</button>
          <button className="btn secondary" onClick={() => load().catch((e) => setError(getErrorMessage(e)))}>刷新</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>需求号</th>
              <th>岗位</th>
              <th>部门</th>
              <th>人数</th>
              <th>负责人</th>
              <th>状态</th>
              <th>开放日</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.req_no}</td>
                <td>{posName(row.position_id)}</td>
                <td>{deptName(row.dept_id)}</td>
                <td>{row.headcount}</td>
                <td>{empName(row.owner_emp_id)}</td>
                <td><span className={`tag ${row.status === 'open' ? 'blue' : row.status === 'closed' ? 'ok' : 'warn'}`}>{row.status}</span></td>
                <td>{row.open_date || '-'}</td>
                <td>
                  {row.status === 'open' && (
                    <button className="btn sm" onClick={() => closeReq(row)}>关闭</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty">暂无招聘需求</div>}
      </div>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>新建招聘需求</h3>
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field">
                  <label>需求号</label>
                  <input required value={form.req_no} onChange={(e) => setForm({ ...form, req_no: e.target.value })} />
                </div>
                <div className="field">
                  <label>岗位</label>
                  <select value={form.position_id} onChange={(e) => setForm({ ...form, position_id: e.target.value })}>
                    <option value="">请选择</option>
                    {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>部门</label>
                  <select value={form.dept_id} onChange={(e) => setForm({ ...form, dept_id: e.target.value })}>
                    <option value="">请选择</option>
                    {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>人数</label>
                  <input type="number" min={1} value={form.headcount} onChange={(e) => setForm({ ...form, headcount: e.target.value })} />
                </div>
                <div className="field">
                  <label>负责人</label>
                  <select value={form.owner_emp_id} onChange={(e) => setForm({ ...form, owner_emp_id: e.target.value })}>
                    <option value="">请选择</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.emp_no})</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>开放日</label>
                  <input type="date" value={form.open_date} onChange={(e) => setForm({ ...form, open_date: e.target.value })} />
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
