import { useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import { Perm } from '../components/Perm'

type Todo = {
  id: number
  definition_name?: string
  definition_code?: string
  business_type: string
  business_id: number
  status: string
  current_node_label?: string
  approver_role?: string
}

type History = {
  id: number
  node_label?: string
  action: string
  actor?: string
  comment?: string
  created_at?: string
}

type Detail = Todo & {
  history: History[]
  business?: Record<string, unknown>
  current_node_id?: string
}

export default function Todos() {
  const [list, setList] = useState<Todo[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [comment, setComment] = useState('')

  const load = async () => {
    const r = await api.get<Todo[]>('/api/v1/workflows/todos')
    setList(r.data)
  }

  useEffect(() => {
    load().catch((e) => setError(getErrorMessage(e)))
  }, [])

  const openDetail = async (id: number) => {
    setError('')
    try {
      const r = await api.get<Detail>(`/api/v1/workflows/instances/${id}`)
      setDetail(r.data)
      setComment('')
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  const advance = async (id: number, action: 'approve' | 'reject') => {
    setError('')
    try {
      await api.post(`/api/v1/workflows/instances/${id}/advance`, { action, comment: comment || null })
      setOk(`实例 #${id} 已${action === 'approve' ? '通过/推进' : '驳回'}`)
      setDetail(null)
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
        <p className="muted">按当前用户<strong>本地岗位 code</strong>匹配审批节点；点「详情」查看单据快照与流转历史，审批意见仅在此提交。</p>
        <table>
          <thead>
            <tr>
              <th>实例</th>
              <th>流程</th>
              <th>业务</th>
              <th>当前节点</th>
              <th>岗位 code</th>
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
                <td><code>{row.approver_role || '-'}</code></td>
                <td>
                  <button className="btn sm secondary" onClick={() => openDetail(row.id)}>详情</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty">暂无待办（或当前岗位无需审批）</div>}
      </div>

      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal" style={{ maxWidth: 780 }} onClick={(e) => e.stopPropagation()}>
            <h3>待办详情 — 实例 #{detail.id}</h3>
            <div className="alert info">
              流程：{detail.definition_name}（{detail.definition_code}） · 节点：{detail.current_node_label} · 岗位：
              <code>{detail.approver_role}</code>
            </div>
            <h4>单据快照（{detail.business_type}#{detail.business_id}）</h4>
            <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 8, maxHeight: 220, overflow: 'auto', fontSize: 12 }}>
              {JSON.stringify(detail.business || {}, null, 2)}
            </pre>
            <h4>流转历史</h4>
            <table>
              <thead><tr><th>时间</th><th>节点</th><th>动作</th><th>操作人</th><th>意见</th></tr></thead>
              <tbody>
                {(detail.history || []).map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontSize: 12 }}>{h.created_at ? new Date(h.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '-'}</td>
                    <td>{h.node_label || '-'}</td>
                    <td>{h.action}</td>
                    <td>{h.actor || '-'}</td>
                    <td>{h.comment || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(detail.history || []).length === 0 && <div className="empty">暂无历史</div>}
            {detail.status === 'running' && (
              <>
                <div className="field" style={{ marginTop: 12 }}>
                  <label>审批意见</label>
                  <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="可选" />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn secondary" onClick={() => setDetail(null)}>关闭</button>
                  <Perm code="btn.workflows.advance">
                    <button type="button" className="btn" onClick={() => advance(detail.id, 'approve')}>同意推进</button>{' '}
                    <button type="button" className="btn danger" onClick={() => advance(detail.id, 'reject')}>驳回</button>
                  </Perm>
                </div>
              </>
            )}
            {detail.status !== 'running' && (
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setDetail(null)}>关闭</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
