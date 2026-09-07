import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, describeRequestError, isMissingApi, unwrapList } from '../api/client'
import { Perm } from '../components/Perm'
import { BTN_PERM } from '../config/rbac'
import { SCORECARD_MAX, V22_SCORECARD, matchScorecardDef } from '../config/kpiScorecard'
import type { Employee, Headcount, HrManagerScore, KpiRunResult, KpiScorecard, MeltdownFlag, PermissionEvent, Training } from '../api/types'

const defaultMonth = new Date().toISOString().slice(0, 7)

function asScores(data: unknown): HrManagerScore[] {
  if (Array.isArray(data)) return data as HrManagerScore[]
  return unwrapList<HrManagerScore>(data)
}

function flagsFrom(obj: { meltdown_flags?: MeltdownFlag[]; circuit_breakers?: MeltdownFlag[]; melt_down?: boolean; meltdown?: boolean } | null | undefined): MeltdownFlag[] {
  if (!obj) return []
  const list = obj.meltdown_flags || obj.circuit_breakers || []
  return list
}

function scoreBarClass(score: number, weight: number): string {
  if (weight <= 0) return ''
  const ratio = score / weight
  if (ratio <= 0.5) return 'bad'
  if (ratio < 0.8) return 'warn'
  return ''
}

type Snapshot = {
  employees: number
  critical: number
  headcountVacancy: number
  trainingsValid: number
  trainingsTotal: number
  grants: number
  pendingRevokes: number
}

export default function Kpi() {
  const [month, setMonth] = useState(defaultMonth)
  const [result, setResult] = useState<KpiRunResult | null>(null)
  const [scores, setScores] = useState<HrManagerScore[]>([])
  const [scorecardMeta, setScorecardMeta] = useState<KpiScorecard | null>(null)
  const [flags, setFlags] = useState<MeltdownFlag[]>([])
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [error, setError] = useState('')
  const [warn, setWarn] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  const applyScores = (list: HrManagerScore[], extraFlags?: MeltdownFlag[]) => {
    setScores(list)
    const derived: MeltdownFlag[] = []
    for (const s of list) {
      const def = matchScorecardDef(s.kpi_code, s.kpi_name)
      if (s.is_meltdown || s.melt_down) {
        derived.push({
          code: def?.clause || s.kpi_code,
          kpi_code: s.kpi_code,
          name: def?.name || s.kpi_name,
          reason: s.detail || '该条款触发熔断',
          triggered: true,
        })
      }
    }
    const merged = [...(extraFlags || []), ...derived]
    const seen = new Set<string>()
    setFlags(
      merged.filter((f) => {
        const k = `${f.code || f.kpi_code || ''}-${f.reason || f.detail || ''}`
        if (seen.has(k)) return false
        seen.add(k)
        return true
      }),
    )
  }

  const loadSnapshot = useCallback(async () => {
    try {
      const [e, h, t, p] = await Promise.all([
        api.get<Employee[]>('/api/v1/employees').catch(() => ({ data: [] as Employee[] })),
        api.get<Headcount[]>('/api/v1/headcounts').catch(() => ({ data: [] as Headcount[] })),
        api.get<Training[]>('/api/v1/trainings').catch(() => ({ data: [] as Training[] })),
        api.get<PermissionEvent[]>('/api/v1/permissions/events').catch(() => ({ data: [] as PermissionEvent[] })),
      ])
      const employees = e.data || []
      const headcounts = h.data || []
      const trainings = t.data || []
      const events = p.data || []
      const today = new Date().toISOString().slice(0, 10)
      setSnapshot({
        employees: employees.length,
        critical: employees.filter((x) => x.is_critical_role).length,
        headcountVacancy: headcounts.reduce((s, x) => s + (Number(x.vacancy) || 0), 0),
        trainingsTotal: trainings.length,
        trainingsValid: trainings.filter((x) => x.status === 'passed' && (!x.valid_until || x.valid_until >= today)).length,
        grants: events.filter((x) => x.event_type === 'grant').length,
        pendingRevokes: events.filter((x) => x.event_type === 'revoke' && ['pending', 'open', 'due', 'timeout'].includes(x.status)).length,
      })
    } catch {
      setSnapshot(null)
    }
  }, [])

  const loadScores = useCallback(async (ym: string, silent = false) => {
    if (!silent) {
      setError('')
      setWarn('')
    }
    const notes: string[] = []
    let list: HrManagerScore[] = []
    let extraFlags: MeltdownFlag[] = []
    try {
      const res = await api.get<HrManagerScore[] | { scores?: HrManagerScore[] }>('/api/v1/kpi/scores', { params: { year_month: ym } })
      list = asScores(res.data)
    } catch (err) {
      setError(describeRequestError(err, 'GET', `/api/v1/kpi/scores?year_month=${ym}`))
    }
    try {
      const sc = await api.get<KpiScorecard>(`/api/v1/kpi/scorecard`, { params: { year_month: ym } })
      setScorecardMeta(sc.data)
      const scScores = asScores(sc.data.items || sc.data.scores || [])
      if (scScores.length) list = scScores
      extraFlags = flagsFrom(sc.data)
    } catch (err) {
      setScorecardMeta(null)
      if (!isMissingApi(err)) notes.push(describeRequestError(err, 'GET', `/api/v1/kpi/scorecard?year_month=${ym}`))
    }
    try {
      const md = await api.get<{ flags?: MeltdownFlag[]; items?: MeltdownFlag[] } | MeltdownFlag[]>('/api/v1/kpi/meltdown', { params: { year_month: ym } })
      extraFlags = extraFlags.concat(Array.isArray(md.data) ? md.data : unwrapList<MeltdownFlag>(md.data))
    } catch (err) {
      if (!isMissingApi(err)) notes.push(describeRequestError(err, 'GET', `/api/v1/kpi/meltdown?year_month=${ym}`))
    }
    applyScores(list, extraFlags)
    if (notes.length) setWarn(notes.join('\n'))
    if (!silent && list.length) setOk(`已加载 ${ym} 得分 ${list.length} 条`)
  }, [])

  useEffect(() => {
    loadScores(month, true)
    loadSnapshot()
  }, [loadScores, loadSnapshot, month])

  const run = async (ev: FormEvent) => {
    ev.preventDefault()
    setError('')
    setOk('')
    setBusy(true)
    try {
      const res = await api.post<KpiRunResult>(`/api/v1/kpi/batch/${month}/run`)
      setResult(res.data)
      applyScores(res.data.scores || [], flagsFrom(res.data))
      const melted = res.data.meltdown || res.data.melt_down
      setOk(`跑批完成：月份 ${res.data.year_month}，加权总分 ${res.data.total_weighted_score}${melted ? '（已熔断）' : ''}`)
      await loadSnapshot()
    } catch (err) {
      setError(describeRequestError(err, 'POST', `/api/v1/kpi/batch/${month}/run`))
    } finally {
      setBusy(false)
    }
  }

  const rows = useMemo(() => {
    const used = new Set<number>()
    const mapped = V22_SCORECARD.map((def) => {
      const hit = scores.find((s, idx) => {
        if (used.has(idx)) return false
        return Boolean(matchScorecardDef(s.kpi_code, s.kpi_name)?.code === def.code)
      })
      const idx = hit ? scores.indexOf(hit) : -1
      if (idx >= 0) used.add(idx)
      return { def, score: hit || null }
    })
    const extras = scores.filter((_, i) => !used.has(i))
    return { mapped, extras }
  }, [scores])

  const total = useMemo(() => {
    if (result?.total_weighted_score != null) return Number(result.total_weighted_score)
    const meta = scorecardMeta?.total_weighted_score ?? scorecardMeta?.total_score ?? scorecardMeta?.total
    if (meta != null) return Number(meta)
    if (!scores.length) return null
    return scores.reduce((s, x) => s + Number(x.weighted_score || 0), 0)
  }, [result, scorecardMeta, scores])

  const melted = flags.length > 0 || Boolean(result?.meltdown || result?.melt_down || scorecardMeta?.meltdown || scorecardMeta?.melt_down)

  return (
    <div>
      {error && <div className="alert error">{error}</div>}
      {warn && <div className="alert info" style={{ whiteSpace: 'pre-wrap' }}>{warn}</div>}
      {ok && <div className="alert success">{ok}</div>}

      {melted && (
        <div className="alert error">
          <strong>熔断已触发</strong>
          {' '}
          — V2.2 规定开权闸门 / 停权 SLA / R2 证据等红线条款未达标时，当月人事考核按熔断处理。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            {flags.map((f, i) => (
              <li key={`${f.code || f.kpi_code || i}`}>
                {f.code || f.kpi_code || '条款'} {f.name ? `「${f.name}」` : ''}：{f.reason || f.detail || '已熔断'}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="cards">
        <div className="card">
          <div className="label">V2.2 加权总分</div>
          <div className="value">{total == null ? '—' : Number(total).toFixed(1)}</div>
          <div className="hint">满分 {SCORECARD_MAX} · 条款 3.1–3.12</div>
        </div>
        <div className="card">
          <div className="label">熔断</div>
          <div className="value" style={{ fontSize: 22 }}>{melted ? '是' : '否'}</div>
          <div className="hint">{flags.length ? `${flags.length} 条红线` : '3.7 / 3.8 / 3.11 为熔断项'}</div>
        </div>
        <div className="card">
          <div className="label">跑批计划</div>
          <div className="value" style={{ fontSize: 20 }}>次月1日 02:00</div>
          <div className="hint">可在本页手工触发当月批次</div>
        </div>
        <div className="card">
          <div className="label">批次</div>
          <div className="value" style={{ fontSize: 22 }}>{result?.batch_id ?? '—'}</div>
          <div className="hint">{result?.year_month || month}</div>
        </div>
      </div>

      <div className="panel">
        <h2>月度跑批</h2>
        <form className="toolbar" onSubmit={run}>
          <div className="field" style={{ minWidth: 180 }}>
            <label>考核月份</label>
            <input type="month" required value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <Perm code={BTN_PERM.kpiRun}>
            <button className="btn" type="submit" disabled={busy} style={{ marginTop: 18 }}>
              {busy ? '跑批中…' : '触发跑批'}
            </button>
          </Perm>
          <button className="btn secondary" type="button" style={{ marginTop: 18 }} onClick={() => loadScores(month)}>
            查询得分
          </button>
          <Link className="btn secondary" to="/integration-guide" style={{ marginTop: 18, display: 'inline-block' }}>
            对接说明
          </Link>
        </form>
      </div>

      {snapshot && (
        <div className="panel">
          <h2>关联数据表（计分依据）</h2>
          <p className="muted" style={{ marginTop: 0 }}>条款得分来自下列业务表；点击进入明细。</p>
          <div className="cards" style={{ marginBottom: 0 }}>
            <Link to="/employees" className="card">
              <div className="label">员工花名册 employees</div>
              <div className="value">{snapshot.employees}</div>
              <div className="hint">关键岗 {snapshot.critical} · 条款 3.2 / 3.10</div>
            </Link>
            <Link to="/org" className="card">
              <div className="label">编制 headcounts</div>
              <div className="value">{snapshot.headcountVacancy}</div>
              <div className="hint">空缺合计 · 条款 3.1</div>
            </Link>
            <Link to="/trainings" className="card">
              <div className="label">培训 trainings</div>
              <div className="value">{snapshot.trainingsValid}/{snapshot.trainingsTotal}</div>
              <div className="hint">有效通过 / 全部 · 条款 3.6 / 3.7</div>
            </Link>
            <Link to="/permissions" className="card">
              <div className="label">权限 permissions</div>
              <div className="value">{snapshot.grants}</div>
              <div className="hint">开权事件 · 待停权 {snapshot.pendingRevokes} · 条款 3.7 / 3.8</div>
            </Link>
          </div>
        </div>
      )}

      <div className="panel">
        <h2>V2.2 计分卡 3.1–3.12（100 分）</h2>
        <table>
          <thead>
            <tr>
              <th>条款</th>
              <th>指标</th>
              <th>权重</th>
              <th>原始值</th>
              <th>得分</th>
              <th>加权</th>
              <th>进度</th>
              <th>数据表</th>
              <th>明细</th>
            </tr>
          </thead>
          <tbody>
            {rows.mapped.map(({ def, score }) => {
              const pts = score ? Number(score.score) : null
              const w = score?.weight != null ? Number(score.weight) : def.weight
              const barCls = pts == null ? '' : scoreBarClass(pts, w)
              const pct = pts == null || w <= 0 ? 0 : Math.max(0, Math.min(100, (pts / w) * 100))
              return (
                <tr key={def.clause}>
                  <td>
                    <code>{def.clause}</code>
                    {def.meltDown && <div><span className="tag bad">熔断</span></div>}
                  </td>
                  <td>
                    <strong>{def.name}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>{def.hint}</div>
                  </td>
                  <td>{w}</td>
                  <td>{score ? score.raw_value : '—'}</td>
                  <td>{pts == null ? '未出分' : pts}</td>
                  <td>{score ? score.weighted_score : '—'}</td>
                  <td style={{ minWidth: 100 }}>
                    <div className={`score-bar ${barCls}`}>
                      <span style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td>
                    <Link to={def.source.path}>{def.source.label}</Link>
                    <div className="muted" style={{ fontSize: 11 }}><code>{def.source.table}</code></div>
                  </td>
                  <td>{score?.detail || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {scores.length === 0 && <div className="empty">暂无得分，请选择月份后「查询得分」或「触发跑批」</div>}
      </div>

      {rows.extras.length > 0 && (
        <div className="panel">
          <h2>其他得分（未映射到 3.1–3.12）</h2>
          <table>
            <thead>
              <tr>
                <th>月份</th>
                <th>KPI</th>
                <th>名称</th>
                <th>原始值</th>
                <th>得分</th>
                <th>权重</th>
                <th>加权分</th>
                <th>明细</th>
              </tr>
            </thead>
            <tbody>
              {rows.extras.map((s) => (
                <tr key={s.id || `${s.kpi_code}-${s.year_month}`}>
                  <td>{s.year_month}</td>
                  <td>{s.kpi_code}</td>
                  <td>{s.kpi_name}</td>
                  <td>{s.raw_value}</td>
                  <td>{s.score}</td>
                  <td>{s.weight}</td>
                  <td>{s.weighted_score}</td>
                  <td>{s.detail || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="muted" style={{ fontSize: 12 }}>
        跑批：<code>POST /api/v1/kpi/batch/{'{yyyy-mm}'}/run</code>
        {' '}· 得分：<code>GET /api/v1/kpi/scores</code>
        {' '}· 计分卡：<code>GET /api/v1/kpi/scorecard</code>
        {' '}· 熔断：<code>GET /api/v1/kpi/meltdown</code>
        （后两项可选；缺失时仍展示 3.1–3.12 骨架与关联表）。
      </p>
    </div>
  )
}
