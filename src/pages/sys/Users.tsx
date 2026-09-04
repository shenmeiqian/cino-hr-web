import { FormEvent, useEffect, useMemo, useState } from 'react'
import { api, getErrorMessage } from '../../api/client'
import { Perm } from '../../components/Perm'

type Role = { id: number; code: string; name: string }
type Position = { id: number; code: string; title: string }
type Employee = { id: number; emp_no: string; name: string }
type User = {
  id: number
  username: string
  display_name: string
  employee_id?: number | null
  position_id?: number | null
  position_code?: string | null
  position_title?: string | null
  phone?: string | null
  email?: string | null
  status: string
  last_login_at?: string | null
  role_ids: number[]
  role_codes: string[]
}

const emptyForm = {
  username: '',
  display_name: '',
  password: '',
  status: 'active',
  role_ids: [] as number[],
  position_id: '' as string | number,
  employee_id: '' as string | number,
  phone: '',
  email: '',
}

function statusTag(status: string) {
  if (status === 'active') return <span className="tag ok">正常</span>
  if (status === 'frozen') return <span className="tag warn">冻结</span>
  if (status === 'disabled') return <span className="tag bad">禁用</span>
  return <span className="tag">{status}</span>
}

export default function SysUsers() {
  const [list, setList] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPosition, setFilterPosition] = useState('')
  const [resetPwdOpen, setResetPwdOpen] = useState<User | null>(null)
  const [resetPwd, setResetPwd] = useState('')

  const load = async () => {
    const params: Record<string, string | number> = {}
    if (filterStatus) params.status = filterStatus
    if (filterPosition) params.position_id = Number(filterPosition)
    const [u, r, p] = await Promise.all([
      api.get<User[]>('/api/v1/sys/users', { params }),
      api.get<Role[]>('/api/v1/sys/roles'),
      api.get<Position[]>('/api/v1/positions'),
    ])
    setList(u.data)
    setRoles(r.data)
    setPositions(p.data)
    try {
      const e = await api.get<Employee[]>('/api/v1/employees')
      setEmployees(e.data)
    } catch {
      setEmployees([])
    }
  }

  useEffect(() => {
    load().catch((e) => setError(getErrorMessage(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const empLabel = useMemo(() => {
    const m = new Map(employees.map((e) => [e.id, `${e.emp_no} ${e.name}`]))
    return (id?: number | null) => (id ? m.get(id) || `#${id}` : '-')
  }, [employees])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setOpen(true)
  }

  const openEdit = (u: User) => {
    setEditing(u)
    setForm({
      username: u.username,
      display_name: u.display_name,
      password: '',
      status: u.status,
      role_ids: [...u.role_ids],
      position_id: u.position_id ?? '',
      employee_id: u.employee_id ?? '',
      phone: u.phone || '',
      email: u.email || '',
    })
    setOpen(true)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const payload: Record<string, unknown> = {
      display_name: form.display_name,
      status: form.status,
      role_ids: form.role_ids,
      position_id: form.position_id === '' ? null : Number(form.position_id),
      employee_id: form.employee_id === '' ? null : Number(form.employee_id),
      phone: form.phone || null,
      email: form.email || null,
    }
    try {
      if (editing) {
        if (form.password) payload.password = form.password
        await api.put(`/api/v1/sys/users/${editing.id}`, payload)
        setOk('用户已更新（冻结会立即使 Token 失效；对方需重新登录刷新权限）')
      } else {
        await api.post('/api/v1/sys/users', {
          ...payload,
          username: form.username,
          password: form.password,
        })
        setOk('用户已创建')
      }
      setOpen(false)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const toggleRole = (id: number) => {
    setForm((f) => ({
      ...f,
      role_ids: f.role_ids.includes(id) ? f.role_ids.filter((x) => x !== id) : [...f.role_ids, id],
    }))
  }

  const freeze = async (u: User) => {
    try {
      await api.post(`/api/v1/sys/users/${u.id}/freeze`)
      setOk(`已冻结 ${u.username}，会话 Token 已失效`)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const unfreeze = async (u: User) => {
    try {
      await api.post(`/api/v1/sys/users/${u.id}/unfreeze`)
      setOk(`已解冻 ${u.username}`)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const doResetPwd = async (e: FormEvent) => {
    e.preventDefault()
    if (!resetPwdOpen) return
    try {
      await api.post(`/api/v1/sys/users/${resetPwdOpen.id}/reset-password`, { password: resetPwd })
      setOk(`已重置 ${resetPwdOpen.username} 密码，旧 Token 已失效`)
      setResetPwdOpen(null)
      setResetPwd('')
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
          <Perm code="btn.sys.users.create">
            <button className="btn" onClick={openCreate}>新建用户</button>
          </Perm>
          <button className="btn secondary" onClick={() => load()}>刷新</button>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">状态(全部)</option>
            <option value="active">正常</option>
            <option value="frozen">冻结</option>
            <option value="disabled">禁用</option>
          </select>
          <select value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)}>
            <option value="">岗位(全部)</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>{p.title} ({p.code})</option>
            ))}
          </select>
          <button className="btn secondary" onClick={() => load().catch((e) => setError(getErrorMessage(e)))}>筛选</button>
        </div>
        <p className="muted">用户只通过<strong>角色</strong>获得权限；可关联本地岗位、绑定员工、冻结/解冻（冻结后无法登录且 Token 失效）。</p>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>显示名</th>
              <th>岗位</th>
              <th>员工</th>
              <th>手机/邮箱</th>
              <th>角色</th>
              <th>状态</th>
              <th>最近登录</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>{u.display_name}</td>
                <td>{u.position_title ? `${u.position_title}` : '-'}{u.position_code ? <code style={{ marginLeft: 4 }}>{u.position_code}</code> : null}</td>
                <td>{empLabel(u.employee_id)}</td>
                <td>
                  <div style={{ fontSize: 12 }}>{u.phone || '-'}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{u.email || ''}</div>
                </td>
                <td>{u.role_codes.join(', ') || '-'}</td>
                <td>{statusTag(u.status)}</td>
                <td style={{ fontSize: 12 }}>{u.last_login_at ? new Date(u.last_login_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '-'}</td>
                <td>
                  <Perm code="btn.sys.users.edit">
                    <button className="btn sm" onClick={() => openEdit(u)}>编辑</button>{' '}
                    {u.status === 'frozen' ? (
                      <button className="btn sm secondary" onClick={() => unfreeze(u)}>解冻</button>
                    ) : u.status === 'active' ? (
                      <button className="btn sm danger" onClick={() => freeze(u)}>冻结</button>
                    ) : null}{' '}
                    <button className="btn sm secondary" onClick={() => { setResetPwdOpen(u); setResetPwd('') }}>重置密码</button>
                  </Perm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <h3>{editing ? '编辑用户' : '新建用户'}</h3>
            <form onSubmit={submit}>
              <div className="form-grid">
                {!editing && (
                  <div className="field">
                    <label>用户名</label>
                    <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                  </div>
                )}
                <div className="field">
                  <label>显示名</label>
                  <input required value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
                </div>
                <div className="field">
                  <label>{editing ? '新密码（留空不改）' : '密码'}</label>
                  <input type="password" required={!editing} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="field">
                  <label>状态</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">正常 active</option>
                    <option value="frozen">冻结 frozen</option>
                    <option value="disabled">禁用 disabled</option>
                  </select>
                </div>
                <div className="field">
                  <label>岗位（本地）</label>
                  <select value={String(form.position_id)} onChange={(e) => setForm({ ...form, position_id: e.target.value })}>
                    <option value="">（未关联）</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>{p.title} ({p.code})</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>绑定员工</label>
                  <select value={String(form.employee_id)} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                    <option value="">（未绑定）</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.emp_no} {emp.name}</option>
                    ))}
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
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>分配角色（多选）</label>
                  <div className="perm-grid">
                    {roles.map((r) => (
                      <label key={r.id} className="checkbox">
                        <input type="checkbox" checked={form.role_ids.includes(r.id)} onChange={() => toggleRole(r.id)} />
                        {r.name} <code>{r.code}</code>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setOpen(false)}>取消</button>
                <button type="submit" className="btn">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetPwdOpen && (
        <div className="modal-backdrop" onClick={() => setResetPwdOpen(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>重置密码 — {resetPwdOpen.username}</h3>
            <form onSubmit={doResetPwd}>
              <div className="field">
                <label>新密码</label>
                <input type="password" required minLength={4} value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setResetPwdOpen(null)}>取消</button>
                <button type="submit" className="btn">确认重置</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
