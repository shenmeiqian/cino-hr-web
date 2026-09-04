import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../../api/client'
import { Perm } from '../../components/Perm'

type Role = { id: number; code: string; name: string }
type User = {
  id: number
  username: string
  display_name: string
  employee_id?: number | null
  status: string
  role_ids: number[]
  role_codes: string[]
}

export default function SysUsers() {
  const [list, setList] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({
    username: '',
    display_name: '',
    password: '',
    status: 'active',
    role_ids: [] as number[],
  })

  const load = async () => {
    const [u, r] = await Promise.all([
      api.get<User[]>('/api/v1/sys/users'),
      api.get<Role[]>('/api/v1/sys/roles'),
    ])
    setList(u.data)
    setRoles(r.data)
  }

  useEffect(() => {
    load().catch((e) => setError(getErrorMessage(e)))
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ username: '', display_name: '', password: '', status: 'active', role_ids: [] })
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
    })
    setOpen(true)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (editing) {
        await api.put(`/api/v1/sys/users/${editing.id}`, {
          display_name: form.display_name,
          status: form.status,
          role_ids: form.role_ids,
          ...(form.password ? { password: form.password } : {}),
        })
        setOk('用户已更新（角色即时生效，对方需重新登录刷新权限）')
      } else {
        await api.post('/api/v1/sys/users', {
          username: form.username,
          display_name: form.display_name,
          password: form.password,
          status: form.status,
          role_ids: form.role_ids,
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
        </div>
        <p className="muted">用户只通过<strong>角色</strong>获得权限；在此分配角色，勿直接勾选权限。</p>
        <table>
          <thead>
            <tr><th>ID</th><th>用户名</th><th>显示名</th><th>角色</th><th>状态</th><th>员工ID</th><th>操作</th></tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>{u.display_name}</td>
                <td>{u.role_codes.join(', ') || '-'}</td>
                <td>{u.status}</td>
                <td>{u.employee_id ?? '-'}</td>
                <td>
                  <Perm code="btn.sys.users.edit">
                    <button className="btn sm" onClick={() => openEdit(u)}>分配角色</button>
                  </Perm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? '编辑用户 / 分配角色' : '新建用户'}</h3>
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
                    <option value="active">active</option>
                    <option value="disabled">disabled</option>
                  </select>
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
    </div>
  )
}
