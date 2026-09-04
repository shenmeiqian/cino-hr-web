import { FormEvent, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import { Perm } from '../components/Perm'
import type { HrManagerScore, KpiRunResult } from '../api/types'

const defaultMonth = new Date().toISOString().slice(0, 7)

export default function Kpi() {
  const [month, setMonth] = useState(defaultMonth)
  const [result, setResult] = useState<KpiRunResult | null>(null)
  const [scores, setScores] = useState<HrManagerScore[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (ev: FormEvent) => {
    ev.preventDefault()
    setError('')
    setOk('')
    setBusy(true)
    try {
      const res = await api.post<KpiRunResult>(`/api/v1/kpi/batch/${month}/run`)
      setResult(res.data)
      setScores(res.data.scores)
      setOk(`跑批完成：月份 ${res.data.year_month}，加权总分 ${res.data.total_weighted_score}`)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const loadScores = async () => {
    setError('')
    try {
      const res = await api.get<HrManagerScore[]>('/api/v1/kpi/scores', { params: { year_month: month } })
      setScores(res.data)
      setOk(`已加载 ${month} 得分 ${res.data.length} 条`)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert success">{ok}</div>}
      <div className="panel">
        <h2>人事主管 KPI 跑批</h2>
        <form className="toolbar" onSubmit={run}>
          <div className="field" style={{ minWidth: 180 }}>
            <label>月份 (yyyy-mm)</label>
            <input required value={month} onChange={(e) => setMonth(e.target.value)} placeholder="2026-09" />
          </div>
          <Perm code="btn.kpi.run"><button className="btn" type="submit" disabled={busy} style={{ marginTop: 18 }}>触发跑批</button></Perm>
          <button className="btn secondary" type="button" onClick={loadScores} style={{ marginTop: 18 }}>查询得分</button>
        </form>
        {result && (
          <div className="cards" style={{ marginTop: 8 }}>
            <div className="card">
              <div className="label">批次 ID</div>
              <div className="value" style={{ fontSize: 22 }}>{result.batch_id}</div>
            </div>
            <div className="card">
              <div className="label">加权总分</div>
              <div className="value" style={{ fontSize: 22 }}>{result.total_weighted_score}</div>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>人事主管得分明细</h2>
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
            {scores.map((s) => (
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
        {scores.length === 0 && <div className="empty">暂无得分，请先跑批或查询</div>}
      </div>
    </div>
  )
}
