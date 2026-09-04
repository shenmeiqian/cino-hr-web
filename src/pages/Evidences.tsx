import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import type { Employee, Evidence } from '../api/types'

export default function Evidences() {
  const [list, setList] = useState<Evidence[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    ref_type: 'training',
    ref_id: '1',
    employee_id: '',
    title: '',
    file_url: '',
    content: '',
    uploaded_by: 'demo',
  })

  const load = async () => {
    const [ev, e] = await Promise.all([
      api.get<Evidence[]>('/api/v1/evidences'),
      api.get<Employee[]>('/api/v1/employees'),
    ])
    setList(ev.data)
    setEmployees(e.data)
    if (ev.data.length === 0) {
      await api.post('/api/v1/evidences', {
        ref_type: 'training',
        ref_id: 1,
        employee_id: e.data.find((x) => x.emp_no === 'E1002')?.id ?? e.data[0]?.id,
        title: 'wipe_r2 培训合格证明（演示）',
        content: 'ISO/R2 相关培训证据样例',
        uploaded_by: 'demo',
      })
      const again = await api.get<Evidence[]>('/api/v1/evidences')
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
      await api.post('/api/v1/evidences', {
        ref_type: form.ref_type,
        ref_id: Number(form.ref_id),
        employee_id: form.employee_id === '' ? null : Number(form.employee_id),
        title: form.title,
        file_url: form.file_url || null,
        content: form.content || null,
        uploaded_by: form.uploaded_by || null,
      })
      setOk('证据已上传')
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
          <button className="btn" onClick={() => { setOpen(true); setError('') }}>上传证据</button>
          <button className="btn secondary" onClick={() => load().catch((e) => setError(getErrorMessage(e)))}>刷新</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>标题</th>
              <th>关联类型</th>
              <th>关联ID</th>
              <th>员工</th>
              <th>上传人</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.title}</td>
                <td>{row.ref_type}</td>
                <td>{row.ref_id}</td>
                <td>{empName(row.employee_id)}</td>
                <td>{row.uploaded_by || '-'}</td>
                <td>{row.created_at ? row.created_at.slice(0, 19).replace('T', ' ') : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty">暂无证据</div>}
      </div>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>上传 R2/ISO 证据</h3>
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field">
                  <label>标题</label>
                  <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="field">
                  <label>关联类型</label>
                  <select value={form.ref_type} onChange={(e) => setForm({ ...form, ref_type: e.target.value })}>
                    <option value="training">training</option>
                    <option value="permission">permission</option>
                    <option value="wipe">wipe</option>
                    <option value="audit">audit</option>
                  </select>
                </div>
                <div className="field">
                  <label>关联 ID</label>
                  <input required type="number" value={form.ref_id} onChange={(e) => setForm({ ...form, ref_id: e.target.value })} />
                </div>
                <div className="field">
                  <label>员工</label>
                  <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                    <option value="">可选</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.emp_no})</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>文件 URL</label>
                  <input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} />
                </div>
                <div className="field">
                  <label>内容摘要</label>
                  <input value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
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
