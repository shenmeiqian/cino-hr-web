import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import type { AttendanceException, Employee } from '../api/types'

export default function Attendance() {
  const [list, setList] = useState<AttendanceException[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    employee_id: '',
    exception_date: new Date().toISOString().slice(0, 10),
    exception_type: 'late',
    minutes: '15',
    status: 'open',
    remark: '',
  })

  const load = async () => {
    const [a, e] = await Promise.all([
      api.get<AttendanceException[]>('/api/v1/attendance-exceptions'),
      api.get<Employee[]>('/api/v1/employees'),
    ])
    setList(a.data)
    setEmployees(e.data)
    if (a.data.length === 0 && e.data[0]) {
      await api.post('/api/v1/attendance-exceptions', {
        employee_id: e.data[0].id,
        exception_date: new Date().toISOString().slice(0, 10),
        exception_type: 'late',
        minutes: 20,
        status: 'open',
        remark: '演示迟到',
      })
      const again = await api.get<AttendanceException[]>('/api/v1/attendance-exceptions')
      setList(again.data)
    }
  }

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err)))
  }, [])

  const empName = (id: number) => {
    const e = employees.find((x) => x.id === id)
    return e ? `${e.name}(${e.emp_no})` : String(id)
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    setError('')
    setOk('')
    try {
      await api.post('/api/v1/attendance-exceptions', {
        employee_id: Number(form.employee_id),
        exception_date: form.exception_date,
        exception_type: form.exception_type,
        minutes: Number(form.minutes) || 0,
        status: form.status,
        remark: form.remark || null,
      })
      setOk('考勤异常已登记')
      setOpen(false)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const resolve = async (row: AttendanceException) => {
    try {
      await api.patch(`/api/v1/attendance-exceptions/${row.id}`, { status: 'resolved' })
      setOk(`异常 #${row.id} 已处理`)
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
          <button className="btn" onClick={() => { setOpen(true); setError('') }}>登记异常</button>
          <button className="btn secondary" onClick={() => load().catch((e) => setError(getErrorMessage(e)))}>刷新</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>员工</th>
              <th>日期</th>
              <th>类型</th>
              <th>分钟</th>
              <th>状态</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{empName(row.employee_id)}</td>
                <td>{row.exception_date}</td>
                <td>{row.exception_type}</td>
                <td>{row.minutes}</td>
                <td><span className={`tag ${row.status === 'resolved' ? 'ok' : 'warn'}`}>{row.status}</span></td>
                <td>{row.remark || '-'}</td>
                <td>
                  {row.status !== 'resolved' && (
                    <button className="btn sm" onClick={() => resolve(row)}>标记已处理</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty">暂无考勤异常</div>}
      </div>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>登记考勤异常</h3>
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
                  <label>日期</label>
                  <input type="date" required value={form.exception_date} onChange={(e) => setForm({ ...form, exception_date: e.target.value })} />
                </div>
                <div className="field">
                  <label>类型</label>
                  <select value={form.exception_type} onChange={(e) => setForm({ ...form, exception_type: e.target.value })}>
                    <option value="late">迟到</option>
                    <option value="early_leave">早退</option>
                    <option value="absent">旷工</option>
                    <option value="missing_punch">缺卡</option>
                  </select>
                </div>
                <div className="field">
                  <label>分钟</label>
                  <input type="number" min={0} value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} />
                </div>
                <div className="field">
                  <label>备注</label>
                  <input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
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
