import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import type { Department, Employee, Position } from '../api/types'

const emptyForm = {
  emp_no: '',
  name: '',
  dept_id: '' as string | number,
  position_id: '' as string | number,
  system_account_id: '',
  status: 'active',
  is_media_contact: false,
  is_critical_role: false,
  phone: '',
  email: '',
  remark: '',
}

export default function Employees() {
  const [list, setList] = useState<Employee[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [form, setForm] = useState({ ...emptyForm })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const load = async () => {
    const [e, d, p] = await Promise.all([
      api.get<Employee[]>('/api/v1/employees'),
      api.get<Department[]>('/api/v1/departments'),
      api.get<Position[]>('/api/v1/positions'),
    ])
    setList(e.data)
    setDepts(d.data)
    setPositions(p.data)
  }

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err)))
  }, [])

  const deptName = (id?: number | null) => depts.find((d) => d.id === id)?.name || '-'
  const posName = (id?: number | null) => positions.find((p) => p.id === id)?.title || '-'

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm })
    setOpen(true)
    setError('')
  }

  const openEdit = (row: Employee) => {
    setEditingId(row.id)
    setForm({
      emp_no: row.emp_no,
      name: row.name,
      dept_id: row.dept_id ?? '',
      position_id: row.position_id ?? '',
      system_account_id: row.system_account_id || '',
      status: row.status,
      is_media_contact: row.is_media_contact,
      is_critical_role: row.is_critical_role,
      phone: row.phone || '',
      email: row.email || '',
      remark: row.remark || '',
    })
    setOpen(true)
    setError('')
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    setError('')
    setOk('')
    const payload = {
      name: form.name,
      dept_id: form.dept_id === '' ? null : Number(form.dept_id),
      position_id: form.position_id === '' ? null : Number(form.position_id),
      system_account_id: form.system_account_id || null,
      status: form.status,
      is_media_contact: form.is_media_contact,
      is_critical_role: form.is_critical_role,
      phone: form.phone || null,
      email: form.email || null,
      remark: form.remark || null,
    }
    try {
      if (editingId == null) {
        await api.post('/api/v1/employees', { ...payload, emp_no: form.emp_no })
        setOk('员工已创建')
      } else {
        await api.patch(`/api/v1/employees/${editingId}`, payload)
        setOk('员工已更新')
      }
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
          <button className="btn" onClick={openCreate}>新建员工</button>
          <button className="btn secondary" onClick={() => load().catch((e) => setError(getErrorMessage(e)))}>刷新</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>工号</th>
              <th>姓名</th>
              <th>部门</th>
              <th>岗位</th>
              <th>系统账号</th>
              <th>关键岗</th>
              <th>介质接触</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.emp_no}</td>
                <td>{row.name}</td>
                <td>{deptName(row.dept_id)}</td>
                <td>{posName(row.position_id)}</td>
                <td>{row.system_account_id || '-'}</td>
                <td>{row.is_critical_role ? <span className="tag warn">是</span> : '否'}</td>
                <td>{row.is_media_contact ? <span className="tag blue">是</span> : '否'}</td>
                <td><span className="tag">{row.status}</span></td>
                <td><button className="btn secondary sm" onClick={() => openEdit(row)}>编辑</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty">暂无员工</div>}
      </div>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId == null ? '新建员工' : `编辑员工 #${editingId}`}</h3>
            {error && <div className="alert error">{error}</div>}
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field">
                  <label>工号</label>
                  <input required disabled={editingId != null} value={form.emp_no} onChange={(e) => setForm({ ...form, emp_no: e.target.value })} />
                </div>
                <div className="field">
                  <label>姓名</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="field">
                  <label>部门</label>
                  <select value={form.dept_id} onChange={(e) => setForm({ ...form, dept_id: e.target.value })}>
                    <option value="">未选择</option>
                    {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>岗位</label>
                  <select value={form.position_id} onChange={(e) => setForm({ ...form, position_id: e.target.value })}>
                    <option value="">未选择</option>
                    {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>system_account_id</label>
                  <input value={form.system_account_id} onChange={(e) => setForm({ ...form, system_account_id: e.target.value })} placeholder="综合系统3.0账号" />
                </div>
                <div className="field">
                  <label>状态</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">active</option>
                    <option value="leave">leave</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>
                <div className="field">
                  <label>手机</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="field">
                  <label>邮箱</label>
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="field checkbox">
                  <input type="checkbox" checked={form.is_critical_role} onChange={(e) => setForm({ ...form, is_critical_role: e.target.checked })} />
                  <span>关键岗 is_critical_role</span>
                </div>
                <div className="field checkbox">
                  <input type="checkbox" checked={form.is_media_contact} onChange={(e) => setForm({ ...form, is_media_contact: e.target.checked })} />
                  <span>介质接触岗 is_media_contact</span>
                </div>
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label>备注</label>
                <textarea rows={2} value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setOpen(false)}>取消</button>
                <button type="submit" className="btn">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
