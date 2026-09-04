import { FormEvent, useEffect, useMemo, useState } from 'react'
import { api, getErrorMessage } from '../../api/client'
import { Perm } from '../../components/Perm'

type PermNode = {
  id: number
  code: string
  name: string
  type: string
  parent_id?: number | null
  sort_order: number
  children?: PermNode[]
}
type Role = { id: number; code: string; name: string; description?: string; permission_ids: number[] }

function collectIds(nodes: PermNode[], acc: number[] = []): number[] {
  for (const n of nodes) {
    acc.push(n.id)
    if (n.children?.length) collectIds(n.children, acc)
  }
  return acc
}

function PermTreeCheck({
  nodes,
  checked,
  onToggle,
  depth = 0,
}: {
  nodes: PermNode[]
  checked: Set<number>
  onToggle: (id: number, childIds: number[]) => void
  depth?: number
}) {
  return (
    <ul className="perm-tree" style={{ paddingLeft: depth ? 16 : 0 }}>
      {nodes.map((n) => {
        const childIds = collectIds(n.children || [])
        const allKids = childIds.length > 0 && childIds.every((id) => checked.has(id))
        const someKids = childIds.some((id) => checked.has(id))
        return (
          <li key={n.id}>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={checked.has(n.id)}
                ref={(el) => {
                  if (el) el.indeterminate = !checked.has(n.id) && someKids && !allKids
                }}
                onChange={() => onToggle(n.id, [n.id, ...childIds])}
              />
              <span className={`tag ${n.type === 'menu' ? 'blue' : n.type === 'button' ? 'ok' : 'warn'}`}>{n.type}</span>
              {n.name} <code>{n.code}</code>
            </label>
            {n.children?.length ? (
              <PermTreeCheck nodes={n.children} checked={checked} onToggle={onToggle} depth={depth + 1} />
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

export default function SysRoles() {
  const [roles, setRoles] = useState<Role[]>([])
  const [tree, setTree] = useState<PermNode[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newRole, setNewRole] = useState({ code: '', name: '', description: '' })

  const load = async (preferId?: number | null) => {
    const [r, p] = await Promise.all([
      api.get<Role[]>('/api/v1/sys/roles'),
      api.get<PermNode[]>('/api/v1/sys/permissions/tree'),
    ])
    setRoles(r.data)
    setTree(p.data)
    const id = preferId ?? selected ?? r.data[0]?.id ?? null
    setSelected(id)
    const cur = r.data.find((x) => x.id === id)
    setChecked(new Set(cur?.permission_ids || []))
  }

  useEffect(() => {
    load().catch((e) => setError(getErrorMessage(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cur = useMemo(() => roles.find((r) => r.id === selected), [roles, selected])

  const selectRole = (id: number) => {
    const r = roles.find((x) => x.id === id)
    setSelected(id)
    setChecked(new Set(r?.permission_ids || []))
    setOk('')
  }

  const onToggle = (id: number, cascadeIds: number[]) => {
    setChecked((prev) => {
      const n = new Set(prev)
      const turningOn = !n.has(id)
      for (const x of cascadeIds) {
        if (turningOn) n.add(x)
        else n.delete(x)
      }
      return n
    })
  }

  const save = async () => {
    if (!selected) return
    try {
      await api.put(`/api/v1/sys/roles/${selected}`, { permission_ids: Array.from(checked) })
      setOk('角色权限已全量替换保存 — 用户重新登录后菜单/按钮生效')
      await load(selected)
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  const create = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const res = await api.post<Role>('/api/v1/sys/roles', { ...newRole, permission_ids: [] })
      setCreateOpen(false)
      setOk('角色已创建，请在权限树勾选后保存')
      await load(res.data.id)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert success">{ok}</div>}
      <div className="wf-layout" style={{ gridTemplateColumns: '220px 1fr' }}>
        <div className="panel wf-left">
          <div className="toolbar">
            <Perm code="btn.sys.roles.edit">
              <button className="btn" onClick={() => setCreateOpen(true)}>新建角色</button>
            </Perm>
          </div>
          <h2>角色列表</h2>
          <p className="muted" style={{ fontSize: 12 }}>勾选权限树 → 保存（全量替换）→ 用户挂角色</p>
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`wf-def-item ${r.id === selected ? 'active' : ''}`}
              onClick={() => selectRole(r.id)}
            >
              <strong>{r.name}</strong>
              <span>{r.code}</span>
            </button>
          ))}
        </div>
        <div className="panel" style={{ flex: 1 }}>
          <div className="toolbar">
            <h2 style={{ margin: 0 }}>{cur ? `${cur.name} (${cur.code})` : '选择角色'}</h2>
            <Perm code="btn.sys.roles.edit">
              <button className="btn" onClick={save} disabled={!selected}>保存权限分配</button>
            </Perm>
          </div>
          <PermTreeCheck nodes={tree} checked={checked} onToggle={onToggle} />
        </div>
      </div>
      {createOpen && (
        <div className="modal-backdrop" onClick={() => setCreateOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>新建角色</h3>
            <form onSubmit={create}>
              <div className="form-grid">
                <div className="field"><label>编码</label><input required value={newRole.code} onChange={(e) => setNewRole({ ...newRole, code: e.target.value })} /></div>
                <div className="field"><label>名称</label><input required value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} /></div>
                <div className="field"><label>说明</label><input value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setCreateOpen(false)}>取消</button>
                <button type="submit" className="btn">创建</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
