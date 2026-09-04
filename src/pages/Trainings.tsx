import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import { Perm } from '../components/Perm'
import type { Employee, Training } from '../api/types'

const COURSES = [
  { code: 'safety', name: '安全培训' },
  { code: 'sop', name: 'SOP 操作规范' },
  { code: 'wipe_r2', name: '擦除 R2' },
]

export default function Trainings() {
  const [list, setList] = useState<Training[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    employee_id: '',
    course_code: 'safety',
    course_name: '安全培训',
    status: 'passed',
    score: '100',
    trained_at: new Date().toISOString().slice(0, 10),
    valid_until: '',
    remark: '',
  })

  const load = async () => {
    const [t, e] = await Promise.all([
      api.get<Training[]>('/api/v1/trainings'),
      api.get<Employee[]>('/api/v1/employees'),
    ])
    setList(t.data)
    setEmployees(e.data)
  }

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err)))
  }, [])

  const empName = (id: number) => {
    const e = employees.find((x) => x.id === id)
    return e ? `${e.name}(${e.emp_no})` : String(id)
  }

  const onCourseChange = (code: string) => {
    const c = COURSES.find((x) => x.code === code)
    setForm({ ...form, course_code: code, course_name: c?.name || code })
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    setError('')
    setOk('')
    try {
      await api.post('/api/v1/trainings', {
        employee_id: Number(form.employee_id),
        course_code: form.course_code,
        course_name: form.course_name,
        status: form.status,
        score: form.score === '' ? null : Number(form.score),
        trained_at: form.trained_at || null,
        valid_until: form.valid_until || null,
        remark: form.remark || null,
      })
      setOk('培训记录已登记')
      setOpen(false)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const markPassed = async (row: Training) => {
    setError('')
    try {
      const until = row.valid_until || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
      await api.patch(`/api/v1/trainings/${row.id}`, {
        status: 'passed',
        valid_until: until,
        trained_at: row.trained_at || new Date().toISOString().slice(0, 10),
      })
      setOk(`已标记培训 #${row.id} 为通过`)
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
          <Perm code="btn.trainings.create"><button className="btn" onClick={() => { setOpen(true); setError('') }}>登记培训</button></Perm>
          <button className="btn secondary" onClick={() => load().catch((e) => setError(getErrorMessage(e)))}>刷新</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>员工</th>
              <th>课程</th>
              <th>状态</th>
              <th>分数</th>
              <th>培训日</th>
              <th>有效期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{empName(row.employee_id)}</td>
                <td>{row.course_code} / {row.course_name}</td>
                <td>
                  <span className={`tag ${row.status === 'passed' ? 'ok' : row.status === 'failed' ? 'bad' : 'warn'}`}>
                    {row.status}
                  </span>
                </td>
                <td>{row.score ?? '-'}</td>
                <td>{row.trained_at || '-'}</td>
                <td>{row.valid_until || '-'}</td>
                <td>
                  {row.status !== 'passed' && (
                    <Perm code="btn.trainings.pass"><button className="btn sm" onClick={() => markPassed(row)}>登记通过</button></Perm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty">暂无培训记录</div>}
      </div>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>登记培训</h3>
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
                  <label>课程</label>
                  <select value={form.course_code} onChange={(e) => onCourseChange(e.target.value)}>
                    {COURSES.map((c) => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>状态</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="passed">passed</option>
                    <option value="pending">pending</option>
                    <option value="failed">failed</option>
                  </select>
                </div>
                <div className="field">
                  <label>分数</label>
                  <input value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
                </div>
                <div className="field">
                  <label>培训日</label>
                  <input type="date" value={form.trained_at} onChange={(e) => setForm({ ...form, trained_at: e.target.value })} />
                </div>
                <div className="field">
                  <label>有效期至</label>
                  <input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
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
