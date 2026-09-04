import { FormEvent, Fragment, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../../api/client'
import { Perm } from '../../components/Perm'
import type { MenuNode } from '../../components/Layout'

type ButtonPerm = { code: string; name: string }
type MenuNodeExt = MenuNode & { button_perms?: ButtonPerm[]; children?: MenuNodeExt[] }

type FlatMenu = {
  id: number
  parent_id?: number | null
  title: string
  path?: string | null
  icon?: string | null
  sort_order: number
  permission_code: string
  visible: boolean
  button_perms?: ButtonPerm[]
}

function flatten(nodes: MenuNodeExt[], acc: FlatMenu[] = []): FlatMenu[] {
  for (const n of nodes) {
    acc.push({
      id: n.id,
      parent_id: n.parent_id,
      title: n.title,
      path: n.path,
      icon: n.icon,
      sort_order: n.sort_order,
      permission_code: n.permission_code,
      visible: n.visible,
      button_perms: n.button_perms || [],
    })
    if (n.children?.length) flatten(n.children, acc)
  }
  return acc
}

function TreeRows({
  nodes,
  depth,
  onEdit,
  onDelete,
}: {
  nodes: MenuNodeExt[]
  depth: number
  onEdit: (m: FlatMenu) => void
  onDelete: (id: number) => void
}) {
  return (
    <>
      {nodes.map((n) => (
        <Fragment key={n.id}>
          <tr>
            <td style={{ paddingLeft: 8 + depth * 18 }}>
              {depth > 0 ? '└ ' : ''}
              {n.title}
            </td>
            <td>{n.path || '（分组）'}</td>
            <td><code>{n.permission_code}</code></td>
            <td>
              {(n.button_perms || []).length === 0 ? (
                <span className="muted">—</span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(n.button_perms || []).map((b) => (
                    <span key={b.code} className="tag ok" title={b.code}>
                      {b.name} <code style={{ fontSize: 10 }}>({b.code})</code>
                    </span>
                  ))}
                </div>
              )}
            </td>
            <td>{n.sort_order}</td>
            <td>{n.visible ? '是' : '否'}</td>
            <td>
              <Perm code="btn.sys.menus.edit">
                <button className="btn sm" onClick={() => onEdit(n)}>编辑</button>{' '}
                <button className="btn sm danger" onClick={() => onDelete(n.id)}>删除</button>
              </Perm>
            </td>
          </tr>
          {n.children?.length ? (
            <TreeRows nodes={n.children} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
          ) : null}
        </Fragment>
      ))}
    </>
  )
}

export default function SysMenus() {
  const [tree, setTree] = useState<MenuNodeExt[]>([])
  const [flat, setFlat] = useState<FlatMenu[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FlatMenu | null>(null)
  const [form, setForm] = useState({
    parent_id: '' as string,
    title: '',
    path: '',
    icon: '',
    sort_order: 100,
    permission_code: 'menu.',
    visible: true,
  })

  const load = async () => {
    const r = await api.get<MenuNodeExt[]>('/api/v1/sys/menus')
    setTree(r.data)
    setFlat(flatten(r.data))
  }

  useEffect(() => {
    load().catch((e) => setError(getErrorMessage(e)))
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({
      parent_id: '',
      title: '',
      path: '',
      icon: '',
      sort_order: 100,
      permission_code: 'menu.custom.',
      visible: true,
    })
    setOpen(true)
  }

  const openEdit = (m: FlatMenu) => {
    setEditing(m)
    setForm({
      parent_id: m.parent_id != null ? String(m.parent_id) : '',
      title: m.title,
      path: m.path || '',
      icon: m.icon || '',
      sort_order: m.sort_order,
      permission_code: m.permission_code,
      visible: m.visible,
    })
    setOpen(true)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const payload = {
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      title: form.title,
      path: form.path || null,
      icon: form.icon || null,
      sort_order: Number(form.sort_order),
      permission_code: form.permission_code,
      visible: form.visible,
    }
    try {
      if (editing) {
        await api.put(`/api/v1/sys/menus/${editing.id}`, payload)
        setOk('菜单已更新 — 侧栏下次加载生效')
      } else {
        await api.post('/api/v1/sys/menus', payload)
        setOk('菜单已新增 — 用户需有对应 permission_code 才会看到')
      }
      setOpen(false)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const onDelete = async (id: number) => {
    if (!confirm('确认删除该菜单？')) return
    try {
      await api.delete(`/api/v1/sys/menus/${id}`)
      setOk('已删除')
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
          <h2 style={{ margin: 0 }}>菜单配置</h2>
          <Perm code="btn.sys.menus.edit">
            <button className="btn" onClick={openCreate}>新增菜单</button>
          </Perm>
          <button className="btn secondary" onClick={() => load()}>刷新</button>
        </div>
        <p className="muted">
          侧栏<strong>仅</strong>渲染本表树（按用户菜单权限过滤）。页面按钮权限来自权限树中挂在该菜单
          <code>permission_code</code> 下的 <code>btn.*</code>（见「按钮权限」列）；授权请到角色管理勾选。
        </p>
        <table>
          <thead>
            <tr>
              <th>标题</th>
              <th>路径</th>
              <th>菜单权限码</th>
              <th>按钮权限（btn.*）</th>
              <th>排序</th>
              <th>可见</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <TreeRows nodes={tree} depth={0} onEdit={openEdit} onDelete={onDelete} />
          </tbody>
        </table>
      </div>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? '编辑菜单' : '新增菜单'}</h3>
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field">
                  <label>标题</label>
                  <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="field">
                  <label>路径（分组留空）</label>
                  <input value={form.path} onChange={(e) => setForm({ ...form, path: e.target.value })} placeholder="/example" />
                </div>
                <div className="field">
                  <label>权限码 permission_code</label>
                  <input required value={form.permission_code} onChange={(e) => setForm({ ...form, permission_code: e.target.value })} />
                </div>
                <div className="field">
                  <label>父菜单</label>
                  <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
                    <option value="">（顶级）</option>
                    {flat
                      .filter((m) => !editing || m.id !== editing.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title} #{m.id}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="field">
                  <label>排序</label>
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                </div>
                <div className="field">
                  <label>图标（可选）</label>
                  <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
                </div>
                <div className="field checkbox">
                  <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} />
                  <label style={{ margin: 0 }}>可见</label>
                </div>
              </div>
              {editing?.button_perms?.length ? (
                <p className="muted" style={{ fontSize: 12 }}>
                  本页关联按钮权限：{editing.button_perms.map((b) => `${b.name}(${b.code})`).join('、')}
                </p>
              ) : null}
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
