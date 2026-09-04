import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Connection,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { api, getErrorMessage } from '../api/client'
import type { WorkflowDefinition, WorkflowInstance, WorkflowNode } from '../api/types'

type FlowNodeData = {
  label: string
  nodeType: WorkflowNode['type']
  approverRole?: string
}

const PALETTE: Array<{ type: WorkflowNode['type']; label: string }> = [
  { type: 'start', label: '开始' },
  { type: 'approval', label: '审批节点' },
  { type: 'condition', label: '条件' },
  { type: 'end', label: '结束' },
]

function FlowNodeView({ data, selected }: NodeProps) {
  const d = data as FlowNodeData
  return (
    <div className={`wf-node wf-${d.nodeType} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="wf-node-title">{d.label}</div>
      {d.approverRole && <div className="wf-node-sub">角色: {d.approverRole}</div>}
      <div className="wf-node-type">{d.nodeType}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

const nodeTypes = { flowNode: FlowNodeView }

function toFlowNodes(nodes: WorkflowNode[]): Node[] {
  return (nodes || []).map((n) => ({
    id: n.id,
    type: 'flowNode',
    position: { x: n.x ?? 0, y: n.y ?? 0 },
    data: {
      label: n.label,
      nodeType: n.type,
      approverRole: n.approverRole,
    } satisfies FlowNodeData,
  }))
}

function toFlowEdges(edges: WorkflowDefinition['edges']): Edge[] {
  return (edges || []).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
  }))
}

function fromFlow(
  nodes: Node[],
  edges: Edge[],
): { nodes: WorkflowNode[]; edges: WorkflowDefinition['edges'] } {
  return {
    nodes: nodes.map((n) => {
      const d = n.data as FlowNodeData
      return {
        id: n.id,
        type: d.nodeType,
        label: d.label,
        x: Math.round(n.position.x),
        y: Math.round(n.position.y),
        approverRole: d.approverRole,
      }
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: typeof e.label === 'string' ? e.label : undefined,
    })),
  }
}

export default function Workflows() {
  const [defs, setDefs] = useState<WorkflowDefinition[]>([])
  const [instances, setInstances] = useState<WorkflowInstance[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [tab, setTab] = useState<'designer' | 'instances'>('designer')
  const [form, setForm] = useState({ code: '', name: '', description: '' })
  const [nameEdit, setNameEdit] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [nodeLabel, setNodeLabel] = useState('')
  const [nodeRole, setNodeRole] = useState('')

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const selected = useMemo(() => defs.find((d) => d.id === selectedId) || null, [defs, selectedId])

  const load = async (preferId?: number | null) => {
    const [d, i] = await Promise.all([
      api.get<WorkflowDefinition[]>('/api/v1/workflows/definitions'),
      api.get<WorkflowInstance[]>('/api/v1/workflows/instances'),
    ])
    setDefs(d.data)
    setInstances(i.data)
    const nextId = preferId ?? selectedId ?? d.data[0]?.id ?? null
    setSelectedId(nextId)
    const cur = d.data.find((x) => x.id === nextId)
    if (cur) {
      setNodes(toFlowNodes(cur.nodes))
      setEdges(toFlowEdges(cur.edges))
      setNameEdit(cur.name)
    } else {
      setNodes([])
      setEdges([])
      setNameEdit('')
    }
  }

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectDef = (id: number) => {
    const cur = defs.find((x) => x.id === id)
    setSelectedId(id)
    setSelectedNodeId(null)
    if (cur) {
      setNodes(toFlowNodes(cur.nodes))
      setEdges(toFlowEdges(cur.edges))
      setNameEdit(cur.name)
    }
  }

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `e-${connection.source}-${connection.target}-${Date.now()}`,
          },
          eds,
        ),
      )
    },
    [setEdges],
  )

  const addPaletteNode = (type: WorkflowNode['type'], label: string) => {
    const id = `n-${type}-${Date.now()}`
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'flowNode',
        position: { x: 120 + (nds.length % 4) * 160, y: 80 + Math.floor(nds.length / 4) * 100 },
        data: {
          label,
          nodeType: type,
          approverRole: type === 'approval' ? 'hr' : undefined,
        } satisfies FlowNodeData,
      },
    ])
  }

  const onNodeClick = (_: unknown, node: Node) => {
    const d = node.data as FlowNodeData
    setSelectedNodeId(node.id)
    setNodeLabel(d.label)
    setNodeRole(d.approverRole || '')
  }

  const applyNodeEdit = () => {
    if (!selectedNodeId) return
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNodeId
          ? {
              ...n,
              data: {
                ...(n.data as FlowNodeData),
                label: nodeLabel || (n.data as FlowNodeData).label,
                approverRole: nodeRole || undefined,
              },
            }
          : n,
      ),
    )
    setOk('节点属性已更新（请记得保存流程）')
  }

  const saveDesigner = async () => {
    if (!selectedId) return
    setError('')
    setOk('')
    try {
      const payload = fromFlow(nodes, edges)
      await api.put(`/api/v1/workflows/definitions/${selectedId}`, {
        name: nameEdit || selected?.name,
        nodes: payload.nodes,
        edges: payload.edges,
      })
      setOk('流程已保存')
      await load(selectedId)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const publish = async () => {
    if (!selectedId) return
    setError('')
    try {
      await saveDesigner()
      await api.post(`/api/v1/workflows/definitions/${selectedId}/publish`)
      setOk('流程已发布')
      await load(selectedId)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const createDef = async (ev: FormEvent) => {
    ev.preventDefault()
    setError('')
    try {
      const res = await api.post<WorkflowDefinition>('/api/v1/workflows/definitions', {
        code: form.code,
        name: form.name,
        description: form.description || null,
        nodes: [
          { id: 'n-start', type: 'start', label: '开始', x: 80, y: 160 },
          { id: 'n-end', type: 'end', label: '结束', x: 420, y: 160 },
        ],
        edges: [{ id: 'e-start-end', source: 'n-start', target: 'n-end' }],
      })
      setCreateOpen(false)
      setOk('流程已创建')
      await load(res.data.id)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const startInstance = async () => {
    if (!selectedId || selected?.status !== 'published') {
      setError('请先选择已发布的流程')
      return
    }
    try {
      await api.post('/api/v1/workflows/instances', {
        definition_id: selectedId,
        business_type: 'onboarding',
        business_id: 1,
      })
      setOk('已启动运行实例')
      const i = await api.get<WorkflowInstance[]>('/api/v1/workflows/instances')
      setInstances(i.data)
      setTab('instances')
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const advance = async (id: number, action: 'approve' | 'reject') => {
    try {
      await api.post(`/api/v1/workflows/instances/${id}/advance`, { action })
      setOk(`实例 #${id} 已${action === 'approve' ? '推进/通过' : '驳回'}`)
      const i = await api.get<WorkflowInstance[]>('/api/v1/workflows/instances')
      setInstances(i.data)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert success">{ok}</div>}

      <div className="toolbar" style={{ marginBottom: 12 }}>
        <button className={`btn ${tab === 'designer' ? '' : 'secondary'}`} onClick={() => setTab('designer')}>流程设计</button>
        <button className={`btn ${tab === 'instances' ? '' : 'secondary'}`} onClick={() => setTab('instances')}>运行实例</button>
        <button className="btn secondary" onClick={() => load(selectedId).catch((e) => setError(getErrorMessage(e)))}>刷新</button>
      </div>

      {tab === 'designer' ? (
        <div className="wf-layout">
          <div className="wf-left panel">
            <div className="toolbar">
              <button className="btn" onClick={() => { setCreateOpen(true); setForm({ code: `WF-${Date.now().toString().slice(-6)}`, name: '', description: '' }) }}>新建流程</button>
            </div>
            <h2>流程列表</h2>
            <div className="wf-def-list">
              {defs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`wf-def-item ${d.id === selectedId ? 'active' : ''}`}
                  onClick={() => selectDef(d.id)}
                >
                  <strong>{d.name}</strong>
                  <span>{d.code}</span>
                  <span className={`tag ${d.status === 'published' ? 'ok' : 'warn'}`}>{d.status}</span>
                </button>
              ))}
              {defs.length === 0 && <div className="empty">暂无流程</div>}
            </div>
            <h2 style={{ marginTop: 16 }}>节点库</h2>
            <div className="wf-palette">
              {PALETTE.map((p) => (
                <button key={p.type} type="button" className="btn secondary" onClick={() => addPaletteNode(p.type, p.label)}>
                  + {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="wf-center panel">
            <div className="toolbar">
              <input
                style={{ flex: 1, minWidth: 160, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6 }}
                value={nameEdit}
                onChange={(e) => setNameEdit(e.target.value)}
                placeholder="流程名称"
              />
              <button className="btn" disabled={!selectedId} onClick={() => saveDesigner()}>保存</button>
              <button className="btn secondary" disabled={!selectedId} onClick={() => publish()}>发布</button>
              <button className="btn secondary" disabled={!selectedId || selected?.status !== 'published'} onClick={() => startInstance()}>启动实例</button>
            </div>
            <div className="wf-canvas">
              {selectedId ? (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={onNodeClick}
                  nodeTypes={nodeTypes}
                  fitView
                >
                  <Background />
                  <Controls />
                  <MiniMap />
                </ReactFlow>
              ) : (
                <div className="empty">请选择或新建流程</div>
              )}
            </div>
          </div>

          <div className="wf-right panel">
            <h2>节点属性</h2>
            {selectedNodeId ? (
              <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="field">
                  <label>节点 ID</label>
                  <input value={selectedNodeId} disabled />
                </div>
                <div className="field">
                  <label>显示名称</label>
                  <input value={nodeLabel} onChange={(e) => setNodeLabel(e.target.value)} />
                </div>
                <div className="field">
                  <label>审批角色 approverRole</label>
                  <input value={nodeRole} onChange={(e) => setNodeRole(e.target.value)} placeholder="如 hr / dept_manager" />
                </div>
                <button type="button" className="btn" onClick={applyNodeEdit}>应用</button>
              </div>
            ) : (
              <div className="empty">点击画布中的节点进行编辑</div>
            )}
            <div className="alert info" style={{ marginTop: 16 }}>
              从左侧节点库拖入（点击添加）节点，连接手柄画线，拖动节点调整位置后点「保存」。
            </div>
          </div>
        </div>
      ) : (
        <div className="panel">
          <h2>运行实例</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>定义ID</th>
                <th>业务类型</th>
                <th>业务ID</th>
                <th>当前节点</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {instances.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.definition_id}</td>
                  <td>{row.business_type}</td>
                  <td>{row.business_id}</td>
                  <td>{row.current_node_id || '-'}</td>
                  <td>
                    <span className={`tag ${row.status === 'approved' ? 'ok' : row.status === 'rejected' ? 'bad' : 'blue'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td>
                    {row.status === 'running' && (
                      <>
                        <button className="btn sm" onClick={() => advance(row.id, 'approve')}>同意推进</button>{' '}
                        <button className="btn sm danger" onClick={() => advance(row.id, 'reject')}>驳回</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {instances.length === 0 && <div className="empty">暂无运行实例，可在设计页对已发布流程「启动实例」</div>}
        </div>
      )}

      {createOpen && (
        <div className="modal-backdrop" onClick={() => setCreateOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>新建流程</h3>
            <form onSubmit={createDef}>
              <div className="form-grid">
                <div className="field">
                  <label>编码 code</label>
                  <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                </div>
                <div className="field">
                  <label>名称</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="field">
                  <label>说明</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
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
