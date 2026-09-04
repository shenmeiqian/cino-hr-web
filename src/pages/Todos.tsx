import { useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import { Perm } from '../components/Perm'

type Todo = {
  id: number
  definition_name?: string
  business_type: string
  business_id: number
  status: string
  current_node_label?: string
  approver_role?: string
}

export default function Todos() {
  const [list, setList] = useState<Todo[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const load = async () => {
    const r = await api.get<Todo[]>('/api/v1/workflows/todos')
    setList(r.data)
  }

  useEffect(() => {
    load().catch((e) => setError(getErrorMessage(e)))
  }, [])

  const advance = async (id: number, action: 'approve' | 'reject') => {
    setError('')
    try {
      await api.post(`/api/v1/workflows/instances/${id}/advance`, { action })
      setOk(`实例 #${id} 已${action === 'approve' ? '通过/推进' : '驳回'}`)
      await load()
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  return (
    <div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert success">{ok}</div>}
      <div className="panel">
        <div className="toolbar">
          <button className="btn secondary" onClick={() => load().catch((e) => setError(getErrorMessage(e)))}>刷新</button>
        </div>
        <p className="muted">按当前用户绑定员工的<strong>本地岗位</strong>匹配审批节点 approverRole；单据审批请在此处理，页面内无散落通过/驳回。</p>
        <table>
          <thead>
            <tr>
              <th>实例</th>
              <th>流程</th>
              <th>业务</th>
              <th>当前节点</th>
              <th>岗位角色</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>#{row.id}</td>
                <td>{row.definition_name || '-'}</td>
                <td>{row.business_type}#{row.business_id}</td>
                <td>{row.current_node_label || '-'}</td>
                <td>{row.approver_role || '-'}</td>
                <td>
                  <Perm code="btn.workflows.advance">
                    <button className="btn sm" onClick={() => advance(row.id, 'approve')}>同意推进</button>{' '}
                    <button className="btn sm danger" onClick={() => advance(row.id, 'reject')}>驳回</button>
                  </Perm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty">暂无待办（或当前岗位无需审批）</div>}
      </div>
    </div>
  )
}
