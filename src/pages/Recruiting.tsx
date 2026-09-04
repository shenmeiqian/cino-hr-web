import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import type { Department, Employee, Position, RecruitingReq } from '../api/types'
import { Perm } from '../components/Perm'

type GrantStats = { grant_stats: Record<string, number> }

export default function Recruiting() {
  const [list, setList] = useState<RecruitingReq[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<RecruitingReq | null>(null)
  const [candName, setCandName] = useState('')
  const [candPhone, setCandPhone] = useState('')
  const [form, setForm] = useState({
    req_no: '', position_id: '', dept_id: '', headcount: '1', owner_emp_id: '',
    open_date: new Date().toISOString().slice(0, 10), remark: '',
  })

  const load = async () => {
    const [r, e, p, d, s] = await Promise.all([
      api.get<RecruitingReq[]>('/api/v1/recruiting'),
      api.get<Employee[]>('/api/v1/employees'),
      api.get<Position[]>('/api/v1/positions'),
      api.get<Department[]>('/api/v1/departments'),
      api.get<GrantStats>('/api/v1/recruiting/stats/grant'),
    ])
    setList(r.data)
    setEmployees(e.data)
    setPositions(p.data)
    setDepts(d.data)
    setStats(s.data.grant_stats || {})
  }

  useEffect(() => { load().catch((err) => setError(getErrorMessage(err))) }, [])

  const posName = (id?: number | null) => positions.find((p) => p.id === id)?.title || '-'
  const deptName = (id?: number | null) => depts.find((d) => d.id === id)?.name || '-'

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    try {
      await api.post('/api/v1/recruiting', {
        req_no: form.req_no,
        position_id: form.position_id === '' ? null : Number(form.position_id),
        dept_id: form.dept_id === '' ? null : Number(form.dept_id),
        headcount: Number(form.headcount) || 1,
        status: 'draft',
        stage: 'headcount',
        owner_emp_id: form.owner_emp_id === '' ? null : Number(form.owner_emp_id),
        open_date: form.open_date || null,
        remark: form.remark || null,
      })
      setOk('闭环单已创建（阶段：编制检查）')
      setOpen(false)
      await load()
    } catch (err) { setError(getErrorMessage(err)) }
  }

  const advance = async (id: number, action: string, payload: Record<string, unknown> = {}) => {
    setError('')
    try {
      const r = await api.post<RecruitingReq>(`/api/v1/recruiting/${id}/advance`, { action, ...payload })
      setOk(`已执行 ${action} → stage=${r.data.stage} status=${r.data.status}`)
      setDetail(r.data)
      await load()
    } catch (err) { setError(getErrorMessage(err)) }
  }

  const openDetail = async (id: number) => {
    const r = await api.get<RecruitingReq>(`/api/v1/recruiting/${id}`)
    setDetail(r.data)
    setCandName(r.data.candidate_name || '')
    setCandPhone(r.data.candidate_phone || '')
  }

  const stageBtns = (row: RecruitingReq) => {
    const s = row.stage || 'headcount'
    const btns: Array<{ action: string; label: string; need?: () => Record<string, unknown> }> = []
    if (s === 'headcount') btns.push({ action: 'check_headcount', label: '检查编制' })
    if (s === 'open' || row.status === 'headcount_ok') btns.push({ action: 'open_req', label: '开放需求' })
    if (s === 'candidate' || s === 'open') btns.push({
      action: 'set_candidate', label: '登记候选人',
      need: () => ({ candidate_name: candName, candidate_phone: candPhone || null }),
    })
    if (s === 'approval' || s === 'candidate') btns.push({ action: 'submit_approval', label: '提交审批' })
    if (s === 'onboarding' || row.status === 'approved') btns.push({ action: 'gen_onboarding', label: '生成入职单' })
    if (s === 'contract' || s === 'onboarding') btns.push({ action: 'gen_contract', label: '生成合同' })
    if (s === 'training' || s === 'grant' || s === 'contract') btns.push({ action: 'eval_grant', label: '评估开权' })
    return btns
  }

  return (
    <div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert success">{ok}</div>}

      <div className="cards">
        <div className="card"><div className="label">待开权 ready</div><div className="value">{stats.ready || 0}</div></div>
        <div className="card"><div className="label">已开权 granted</div><div className="value">{stats.granted || 0}</div></div>
        <div className="card"><div className="label">培训闸门 pending_train</div><div className="value">{stats.pending_train || 0}</div></div>
        <div className="card"><div className="label">闭环单数</div><div className="value">{list.length}</div></div>
      </div>

      <div className="panel">
        <div className="toolbar">
          <Perm code="btn.recruiting.create">
            <button className="btn" onClick={() => { setOpen(true); setForm({ ...form, req_no: `REQ-${Date.now().toString().slice(-6)}` }) }}>新建闭环</button>
          </Perm>
          <button className="btn secondary" onClick={() => load()}>刷新</button>
        </div>
        <p className="muted">招聘入职业务闭环：编制 → 需求 → 候选人 → 审批 → 入职 → 合同 → 培训 → 开权（自动统计，无独立开权业务页）。审批只在「待办」完成。</p>
        <table>
          <thead>
            <tr><th>需求号</th><th>岗位</th><th>阶段</th><th>状态</th><th>候选人</th><th>开权</th><th>操作</th></tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.req_no}</td>
                <td>{posName(row.position_id)}</td>
                <td><code>{row.stage}</code></td>
                <td><span className={`tag ${row.status === 'closed' ? 'ok' : 'blue'}`}>{row.status}</span></td>
                <td>{row.candidate_name || '-'}</td>
                <td>{row.grant_status || '-'}</td>
                <td><button className="btn sm secondary" onClick={() => openDetail(row.id).catch((e) => setError(getErrorMessage(e)))}>时间轴</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <h3>闭环详情 {detail.req_no}</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {(detail.timeline || []).map((t) => (
                <div key={t.key} style={{
                  padding: '8px 10px', borderRadius: 8, minWidth: 90, textAlign: 'center', fontSize: 12,
                  background: t.state === 'done' ? '#dcfce7' : t.state === 'current' ? '#dbeafe' : '#f3f4f6',
                  border: t.state === 'current' ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                }}>
                  <div><strong>{t.label}</strong></div>
                  <div className="muted">{t.state}{t.extra ? ` · ${t.extra}` : ''}</div>
                </div>
              ))}
            </div>
            <div className="form-grid">
              <div className="field"><label>候选人姓名</label><input value={candName} onChange={(e) => setCandName(e.target.value)} /></div>
              <div className="field"><label>候选人电话</label><input value={candPhone} onChange={(e) => setCandPhone(e.target.value)} /></div>
            </div>
            <div className="toolbar" style={{ marginTop: 12, flexWrap: 'wrap' }}>
              {stageBtns(detail).map((b) => (
                <Perm key={b.action} code={b.action === 'submit_approval' ? 'btn.recruiting.submit' : 'btn.recruiting.create'}>
                  <button className="btn sm" onClick={() => advance(detail.id, b.action, b.need ? b.need() : {})}>{b.label}</button>
                </Perm>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={() => setDetail(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>新建招聘入职闭环</h3>
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field"><label>需求号</label><input required value={form.req_no} onChange={(e) => setForm({ ...form, req_no: e.target.value })} /></div>
                <div className="field"><label>岗位</label>
                  <select required value={form.position_id} onChange={(e) => setForm({ ...form, position_id: e.target.value })}>
                    <option value="">请选择</option>
                    {positions.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.code})</option>)}
                  </select>
                </div>
                <div className="field"><label>部门</label>
                  <select value={form.dept_id} onChange={(e) => setForm({ ...form, dept_id: e.target.value })}>
                    <option value="">请选择</option>
                    {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="field"><label>负责人</label>
                  <select value={form.owner_emp_id} onChange={(e) => setForm({ ...form, owner_emp_id: e.target.value })}>
                    <option value="">请选择</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setOpen(false)}>取消</button>
                <button type="submit" className="btn">创建</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
