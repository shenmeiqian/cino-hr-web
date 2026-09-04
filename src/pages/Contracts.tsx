import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import type { Contract, Employee } from '../api/types'

export default function Contracts() {
  const [list, setList] = useState<Contract[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    employee_id: '',
    contract_no: '',
    contract_type: 'fixed',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    status: 'active',
    remark: '',
  })

  const load = async () => {
    const [c, e] = await Promise.all([
      api.get<Contract[]>('/api/v1/contracts'),
      api.get<Employee[]>('/api/v1/employees'),
    ])
    setList(c.data)
    setEmployees(e.data)
    if (c.data.length === 0 && e.data[0]) {
      await api.post('/api/v1/contracts', {
        employee_id: e.data[0].id,
        contract_no: `CT-${Date.now().toString().slice(-6)}`,
        contract_type: 'fixed',
        start_date: e.data[0].hire_date || new Date().toISOString().slice(0, 10),
        status: 'active',
        remark: '演示合同',
      })
      const again = await api.get<Contract[]>('/api/v1/contracts')
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
      await api.post('/api/v1/contracts', {
        employee_id: Number(form.employee_id),
        contract_no: form.contract_no,
        contract_type: form.contract_type,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
        remark: form.remark || null,
      })
      setOk('合同已登记')
      setOpen(false)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const terminate = async (row: Contract) => {
    try {
      await api.patch(`/api/v1/contracts/${row.id}`, { status: 'terminated' })
      setOk(`合同 #${row.id} 已终止`)
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
          <button className="btn" onClick={() => { setOpen(true); setError(''); setForm({ ...form, contract_no: `CT-${Date.now().toString().slice(-6)}` }) }}>登记合同</button>
          <button className="btn secondary" onClick={() => load().catch((e) => setError(getErrorMessage(e)))}>刷新</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>员工</th>
              <th>合同号</th>
              <th>类型</th>
              <th>起止</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{empName(row.employee_id)}</td>
                <td>{row.contract_no}</td>
                <td>{row.contract_type}</td>
                <td>{row.start_date || '-'} ~ {row.end_date || '长期'}</td>
                <td><span className={`tag ${row.status === 'active' ? 'ok' : 'warn'}`}>{row.status}</span></td>
                <td>
                  {row.status === 'active' && (
                    <button className="btn sm danger" onClick={() => terminate(row)}>终止</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty">暂无合同</div>}
      </div>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>登记合同</h3>
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
                  <label>合同号</label>
                  <input required value={form.contract_no} onChange={(e) => setForm({ ...form, contract_no: e.target.value })} />
                </div>
                <div className="field">
                  <label>类型</label>
                  <select value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}>
                    <option value="fixed">fixed 固定期限</option>
                    <option value="open">open 无固定</option>
                    <option value="intern">intern 实习</option>
                  </select>
                </div>
                <div className="field">
                  <label>开始日</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="field">
                  <label>结束日</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
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
