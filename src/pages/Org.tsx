import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import { Perm } from '../components/Perm'
import type { Department, Headcount, Position } from '../api/types'

type Role = { id: number; code: string; name: string }

export default function Org() {
  const [headcounts, setHeadcounts] = useState<Headcount[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const [deptOpen, setDeptOpen] = useState(false)
  const [deptForm, setDeptForm] = useState({ code: '', name: '', parent_id: '' as string | number })

  const [posOpen, setPosOpen] = useState(false)
  const [editingPos, setEditingPos] = useState<Position | null>(null)
  const [posForm, setPosForm] = useState({
    code: '', title: '', dept_id: '' as string | number, level: '', jd_summary: '',
    is_universal_temp: false, status: 'active', role_ids: [] as number[],
  })

  const [hcOpen, setHcOpen] = useState(false)
  const [hcForm, setHcForm] = useState({
    year_month: new Date().toISOString().slice(0, 7),
    dept_id: '' as string | number,
    position_id: '' as string | number,
    planned_count: '1',
    actual_count: '0',
    status: 'approved',
    remark: '',
  })

  const load = async () => {
    const [h, p, d, r] = await Promise.all([
      api.get<Headcount[]>('/api/v1/headcounts'),
      api.get<Position[]>('/api/v1/positions'),
      api.get<Department[]>('/api/v1/departments'),
      api.get<Role[]>('/api/v1/sys/roles').catch(() => ({ data: [] as Role[] })),
    ])
    setHeadcounts(h.data)
    setPositions(p.data)
    setDepts(d.data)
    setRoles(r.data)
  }

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err)))
  }, [])

  const deptName = (id?: number | null) => depts.find((d) => d.id === id)?.name || '-'
  const posName = (id?: number | null) => positions.find((p) => p.id === id)?.title || '-'

  const submitDept = async (ev: FormEvent) => {
    ev.preventDefault()
    try {
      await api.post('/api/v1/departments', {
        code: deptForm.code,
        name: deptForm.name,
        parent_id: deptForm.parent_id === '' ? null : Number(deptForm.parent_id),
      })
      setOk('部门已创建')
      setDeptOpen(false)
      await load()
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  const openPosCreate = () => {
    setEditingPos(null)
    setPosForm({ code: '', title: '', dept_id: '', level: '', jd_summary: '', is_universal_temp: false, status: 'active', role_ids: [] })
    setPosOpen(true)
  }
  const openPosEdit = (p: Position) => {
    setEditingPos(p)
    setPosForm({
      code: p.code,
      title: p.title,
      dept_id: p.dept_id ?? '',
      level: p.level || '',
      jd_summary: p.jd_summary || '',
      is_universal_temp: p.is_universal_temp,
      status: p.status,
      role_ids: [...(p.role_ids || [])],
    })
    setPosOpen(true)
  }

  const toggleRole = (id: number) => {
    setPosForm((f) => ({
      ...f,
      role_ids: f.role_ids.includes(id) ? f.role_ids.filter((x) => x !== id) : [...f.role_ids, id],
    }))
  }

  const submitPos = async (ev: FormEvent) => {
    ev.preventDefault()
    setError('')
    try {
      if (editingPos) {
        await api.patch(`/api/v1/positions/${editingPos.id}`, {
          title: posForm.title,
          dept_id: posForm.dept_id === '' ? null : Number(posForm.dept_id),
          level: posForm.level || null,
          jd_summary: posForm.jd_summary || null,
          is_universal_temp: posForm.is_universal_temp,
          status: posForm.status,
          role_ids: posForm.role_ids,
        })
        setOk('岗位已更新（含角色关联）')
      } else {
        await api.post('/api/v1/positions', {
          code: posForm.code,
          title: posForm.title,
          dept_id: posForm.dept_id === '' ? null : Number(posForm.dept_id),
          level: posForm.level || null,
          jd_summary: posForm.jd_summary || null,
          is_universal_temp: posForm.is_universal_temp,
          status: posForm.status,
          role_ids: posForm.role_ids,
        })
        setOk('岗位已创建')
      }
      setPosOpen(false)
      await load()
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  const submitHc = async (ev: FormEvent) => {
    ev.preventDefault()
    try {
      const planned = Number(hcForm.planned_count) || 0
      const actual = Number(hcForm.actual_count) || 0
      await api.post('/api/v1/headcounts', {
        year_month: hcForm.year_month,
        dept_id: hcForm.dept_id === '' ? null : Number(hcForm.dept_id),
        position_id: hcForm.position_id === '' ? null : Number(hcForm.position_id),
        planned_count: planned,
        actual_count: actual,
        vacancy: Math.max(0, planned - actual),
        status: hcForm.status,
        remark: hcForm.remark || null,
      })
      setOk('编制已创建')
      setHcOpen(false)
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
          <h2 style={{ margin: 0, flex: 1 }}>部门</h2>
          <Perm code="api.org.write"><button className="btn" onClick={() => { setDeptForm({ code: '', name: '', parent_id: '' }); setDeptOpen(true) }}>新建部门</button></Perm>
        </div>
        <table>
          <thead><tr><th>编码</th><th>名称</th><th>上级</th></tr></thead>
          <tbody>
            {depts.map((d) => (
              <tr key={d.id}><td><code>{d.code}</code></td><td>{d.name}</td><td>{deptName(d.parent_id)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="toolbar">
          <h2 style={{ margin: 0, flex: 1 }}>批准编制（T02）</h2>
          <Perm code="api.org.write"><button className="btn" onClick={() => setHcOpen(true)}>新建编制</button></Perm>
          <button className="btn secondary" onClick={() => load().catch((e) => setError(getErrorMessage(e)))}>刷新</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>月份</th><th>部门</th><th>岗位</th><th>计划</th><th>实际</th><th>空缺</th><th>状态</th><th>备注</th>
            </tr>
          </thead>
          <tbody>
            {headcounts.map((h) => (
              <tr key={h.id}>
                <td>{h.year_month}</td>
                <td>{deptName(h.dept_id)}</td>
                <td>{posName(h.position_id)}</td>
                <td>{h.planned_count}</td>
                <td>{h.actual_count}</td>
                <td>{h.vacancy}</td>
                <td><span className="tag">{h.status}</span></td>
                <td>{h.remark || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {headcounts.length === 0 && <div className="empty">暂无编制数据</div>}
      </div>

      <div className="panel">
        <div className="toolbar">
          <h2 style={{ margin: 0, flex: 1 }}>岗位库 / JD（T03）— 可关联系统角色</h2>
          <Perm code="api.org.write"><button className="btn" onClick={openPosCreate}>新建岗位</button></Perm>
        </div>
        <p className="muted">岗位 <code>code</code> 唯一，用作审批流节点 <strong>approverRole</strong>。关联角色后，任职该岗的用户在登录/me 时会合并岗位角色（配置 <code>SYNC_ROLES_FROM_POSITION</code>，默认 true）。</p>
        <table>
          <thead>
            <tr>
              <th>编码</th><th>名称</th><th>部门</th><th>级别</th><th>关联角色</th><th>通用临时岗</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.id}>
                <td><code>{p.code}</code></td>
                <td>{p.title}</td>
                <td>{deptName(p.dept_id)}</td>
                <td>{p.level || '-'}</td>
                <td>{(p.role_codes || []).join(', ') || '-'}</td>
                <td>{p.is_universal_temp ? '是' : '否'}</td>
                <td><span className="tag">{p.status}</span></td>
                <td>
                  <Perm code="api.org.write">
                    <button className="btn secondary sm" onClick={() => openPosEdit(p)}>编辑/绑角色</button>
                  </Perm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {positions.length === 0 && <div className="empty">暂无岗位</div>}
      </div>

      {deptOpen && (
        <div className="modal-backdrop" onClick={() => setDeptOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>新建部门</h3>
            <form onSubmit={submitDept}>
              <div className="form-grid">
                <div className="field"><label>编码</label><input required value={deptForm.code} onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })} /></div>
                <div className="field"><label>名称</label><input required value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setDeptOpen(false)}>取消</button>
                <button type="submit" className="btn">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {posOpen && (
        <div className="modal-backdrop" onClick={() => setPosOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <h3>{editingPos ? `编辑岗位 #${editingPos.id}` : '新建岗位'}</h3>
            <form onSubmit={submitPos}>
              <div className="form-grid">
                <div className="field"><label>编码 code（审批人角色）</label>
                  <input required disabled={!!editingPos} value={posForm.code} onChange={(e) => setPosForm({ ...posForm, code: e.target.value })} />
                </div>
                <div className="field"><label>名称</label>
                  <input required value={posForm.title} onChange={(e) => setPosForm({ ...posForm, title: e.target.value })} />
                </div>
                <div className="field"><label>部门</label>
                  <select value={posForm.dept_id} onChange={(e) => setPosForm({ ...posForm, dept_id: e.target.value })}>
                    <option value="">未选择</option>
                    {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="field"><label>级别</label>
                  <input value={posForm.level} onChange={(e) => setPosForm({ ...posForm, level: e.target.value })} />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}><label>JD 摘要</label>
                  <textarea rows={2} value={posForm.jd_summary} onChange={(e) => setPosForm({ ...posForm, jd_summary: e.target.value })} />
                </div>
                <div className="field checkbox">
                  <input type="checkbox" checked={posForm.is_universal_temp} onChange={(e) => setPosForm({ ...posForm, is_universal_temp: e.target.checked })} />
                  <span>通用临时岗</span>
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>关联系统角色（多选）</label>
                  <div className="perm-grid">
                    {roles.map((r) => (
                      <label key={r.id} className="checkbox">
                        <input type="checkbox" checked={posForm.role_ids.includes(r.id)} onChange={() => toggleRole(r.id)} />
                        {r.name} <code>{r.code}</code>
                      </label>
                    ))}
                    {roles.length === 0 && <span className="muted">无角色可选项（需有 sys/roles 读权限）</span>}
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setPosOpen(false)}>取消</button>
                <button type="submit" className="btn">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {hcOpen && (
        <div className="modal-backdrop" onClick={() => setHcOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>新建批准编制</h3>
            <form onSubmit={submitHc}>
              <div className="form-grid">
                <div className="field"><label>月份 YYYY-MM</label>
                  <input required value={hcForm.year_month} onChange={(e) => setHcForm({ ...hcForm, year_month: e.target.value })} />
                </div>
                <div className="field"><label>部门</label>
                  <select value={hcForm.dept_id} onChange={(e) => setHcForm({ ...hcForm, dept_id: e.target.value })}>
                    <option value="">未选择</option>
                    {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="field"><label>岗位</label>
                  <select value={hcForm.position_id} onChange={(e) => setHcForm({ ...hcForm, position_id: e.target.value })}>
                    <option value="">未选择</option>
                    {positions.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.code})</option>)}
                  </select>
                </div>
                <div className="field"><label>计划人数</label>
                  <input type="number" value={hcForm.planned_count} onChange={(e) => setHcForm({ ...hcForm, planned_count: e.target.value })} />
                </div>
                <div className="field"><label>实际人数</label>
                  <input type="number" value={hcForm.actual_count} onChange={(e) => setHcForm({ ...hcForm, actual_count: e.target.value })} />
                </div>
                <div className="field"><label>状态</label>
                  <select value={hcForm.status} onChange={(e) => setHcForm({ ...hcForm, status: e.target.value })}>
                    <option value="draft">draft</option>
                    <option value="approved">approved</option>
                    <option value="closed">closed</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setHcOpen(false)}>取消</button>
                <button type="submit" className="btn">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
