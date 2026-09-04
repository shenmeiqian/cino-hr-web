import { useEffect, useState } from 'react'
import { api, getErrorMessage } from '../../api/client'

type PermNode = {
  id: number
  code: string
  name: string
  type: string
  parent_id?: number | null
  sort_order: number
  children?: PermNode[]
}

function TreeView({ nodes, depth = 0 }: { nodes: PermNode[]; depth?: number }) {
  return (
    <ul className="perm-tree" style={{ paddingLeft: depth ? 16 : 0 }}>
      {nodes.map((n) => (
        <li key={n.id}>
          <span className={`tag ${n.type === 'menu' ? 'blue' : n.type === 'button' ? 'ok' : 'warn'}`}>{n.type}</span>{' '}
          <strong>{n.name}</strong> <code>{n.code}</code>
          {n.children?.length ? <TreeView nodes={n.children} depth={depth + 1} /> : null}
        </li>
      ))}
    </ul>
  )
}

export default function SysPermissions() {
  const [tree, setTree] = useState<PermNode[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<PermNode[]>('/api/v1/sys/permissions/tree')
      .then((r) => setTree(r.data))
      .catch((e) => setError(getErrorMessage(e)))
  }, [])

  return (
    <div>
      {error && <div className="alert error">{error}</div>}
      <div className="panel">
        <div className="toolbar">
          <h2 style={{ margin: 0 }}>权限目录（只读树）</h2>
          <button className="btn secondary" onClick={() => window.location.reload()}>刷新</button>
        </div>
        <p className="muted">
          权限为中央目录（menu / button / api）。授权请到「角色管理」勾选；用户不直接挂权限。
        </p>
        <TreeView nodes={tree} />
      </div>
    </div>
  )
}
