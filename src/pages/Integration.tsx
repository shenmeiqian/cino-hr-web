import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, describeRequestError, isMissingApi, unwrapList } from '../api/client'
import { Perm } from '../components/Perm'
import { BTN_PERM } from '../config/rbac'
import type {
  Employee,
  IntegrationStatus,
  IntegrationSyncResult,
  PendingRevoke,
  PermissionCallbackLog,
  PermissionEvent,
  TrainingValidation,
} from '../api/types'

const SAMPLE_USERS = `[
  {
    "system_account_id": "u-10001",
    "emp_no": "E001",
    "name": "张三",
    "dept_code": "HR",
    "email": "zhangsan@example.com",
    "status": "active",
    "scopes": ["erp"]
  }
]`

const ALL_SCOPES = ['wipe', 'outbound', 'erp', 'wms']

function asObject(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object' && !Array.isArray(data)) return data as Record<string, unknown>
  return { value: data }
}

function stringifyCell(v: unknown): string {
  if (v == null || v === '') return '—'
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

export default function Integration() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [statusRaw, setStatusRaw] = useState<Record<string, unknown> | null>(null)
  const [statusError, setStatusError] = useState('')
  const [jsonText, setJsonText] = useState(SAMPLE_USERS)
  const [parseHint, setParseHint] = useState('')
  const [syncResult, setSyncResult] = useState<IntegrationSyncResult | null>(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [scopes, setScopes] = useState<string[]>(['wipe', 'outbound'])
  const [validation, setValidation] = useState<TrainingValidation | null>(null)
  const [validateError, setValidateError] = useState('')

  const [revokes, setRevokes] = useState<PendingRevoke[]>([])
  const [revokeError, setRevokeError] = useState('')
  const [revokeFallback, setRevokeFallback] = useState('')

  const [callbacks, setCallbacks] = useState<PermissionCallbackLog[]>([])
  const [callbackError, setCallbackError] = useState('')

  const previewUsers = (): { ok: boolean; count: number; payload: unknown; err?: string } => {
    try {
      const parsed = JSON.parse(jsonText)
      const list = unwrapList(parsed)
      const payload = Array.isArray(parsed) ? { users: parsed } : parsed
      const count = list.length || (Array.isArray(parsed) ? parsed.length : 0)
      return { ok: true, count, payload }
    } catch (e) {
      return { ok: false, count: 0, payload: null, err: e instanceof Error ? e.message : String(e) }
    }
  }

  const loadStatus = useCallback(async () => {
    try {
      const r = await api.get<IntegrationStatus>('/api/v1/integration/status')
      setStatus(r.data)
      setStatusRaw(asObject(r.data))
      setStatusError('')
    } catch (err) {
      setStatus(null)
      setStatusRaw(null)
      setStatusError(describeRequestError(err, 'GET', '/api/v1/integration/status'))
    }
  }, [])

  const loadRevokes = useCallback(async () => {
    setRevokeFallback('')
    try {
      const r = await api.get('/api/v1/integration/revokes/pending')
      setRevokes(unwrapList<PendingRevoke>(r.data))
      setRevokeError('')
    } catch (err) {
      setRevokeError(describeRequestError(err, 'GET', '/api/v1/integration/revokes/pending'))
      try {
        const ev = await api.get<PermissionEvent[]>('/api/v1/permissions/events')
        const pending = (ev.data || []).filter(
          (x) => x.event_type === 'revoke' && ['pending', 'open', 'due', 'timeout'].includes(x.status),
        )
        setRevokes(
          pending.map((x) => ({
            id: x.id,
            employee_id: x.employee_id,
            event_type: x.event_type,
            scopes: x.scopes,
            status: x.status,
            trigger: x.trigger,
            due_at: x.due_at,
            reason: x.reason,
            created_at: x.created_at,
          })),
        )
        if (pending.length) {
          setRevokeFallback(
            isMissingApi(err)
              ? '专用接口未就绪，已回退展示权限事件中 status=pending/open 的停权记录。'
              : '已回退展示权限事件中的待停权记录。',
          )
        }
      } catch {
        /* keep primary error */
      }
    }
  }, [])

  const loadCallbacks = useCallback(async () => {
    try {
      const r = await api.get('/api/v1/integration/callbacks')
      setCallbacks(unwrapList<PermissionCallbackLog>(r.data))
      setCallbackError('')
    } catch (err) {
      setCallbacks([])
      setCallbackError(describeRequestError(err, 'GET', '/api/v1/integration/callbacks'))
    }
  }, [])

  const loadEmployees = useCallback(async () => {
    try {
      const r = await api.get<Employee[]>('/api/v1/employees')
      setEmployees(r.data || [])
      setEmployeeId((prev) => prev || (r.data[0] ? String(r.data[0].id) : ''))
    } catch {
      setEmployees([])
    }
  }, [])

  useEffect(() => {
    loadStatus()
    loadRevokes()
    loadCallbacks()
    loadEmployees()
  }, [loadStatus, loadRevokes, loadCallbacks, loadEmployees])

  useEffect(() => {
    const p = previewUsers()
    setParseHint(p.ok ? `可导入 ${p.count} 条用户` : `JSON 无法解析：${p.err}`)
  }, [jsonText])

  const onFile = async (file?: File | null) => {
    if (!file) return
    const text = await file.text()
    setJsonText(text)
  }

  const syncUsers = async (ev: FormEvent) => {
    ev.preventDefault()
    setError('')
    setOk('')
    const p = previewUsers()
    if (!p.ok) {
      setError(`JSON 格式错误，未调用接口：${p.err}`)
      return
    }
    setBusy(true)
    try {
      const res = await api.post<IntegrationSyncResult>('/api/v1/integration/sync/users', p.payload)
      setSyncResult(res.data)
      const created = res.data.created ?? '—'
      const updated = res.data.updated ?? '—'
      const failed = res.data.failed ?? 0
      setOk(res.data.message || `同步完成：新增 ${created}，更新 ${updated}，失败 ${failed}`)
      await loadStatus()
    } catch (err) {
      setError(describeRequestError(err, 'POST', '/api/v1/integration/sync/users'))
    } finally {
      setBusy(false)
    }
  }

  const validateTraining = async () => {
    setValidateError('')
    setValidation(null)
    if (!employeeId) {
      setValidateError('请选择员工')
      return
    }
    try {
      const res = await api.post<TrainingValidation>('/api/v1/integration/validate-training', {
        employee_id: Number(employeeId),
        scopes,
      })
      setValidation(res.data)
    } catch (err) {
      setValidateError(describeRequestError(err, 'POST', '/api/v1/integration/validate-training'))
    }
  }

  const selected = employees.find((e) => String(e.id) === employeeId)
  const gatePassed = validation ? Boolean(validation.passed ?? validation.ok) : null
  const statusEntries = statusRaw
    ? Object.entries(statusRaw).filter(([k]) => k !== 'value')
    : []

  return (
    <div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert success">{ok}</div>}

      <div className="panel">
        <div className="toolbar">
          <h2 style={{ margin: 0 }}>对接状态 · 综合系统 3.0</h2>
          <button className="btn secondary" type="button" onClick={() => { loadStatus(); loadRevokes(); loadCallbacks() }}>刷新</button>
          <Link className="btn secondary" to="/integration-guide">权责与跑批说明</Link>
        </div>
        {statusError && <div className="alert error">{statusError}</div>}
        {!statusError && status && (
          <div className="cards" style={{ marginBottom: 12 }}>
            <div className="card">
              <div className="label">连通</div>
              <div className="value" style={{ fontSize: 22 }}>{status.connected === false ? '否' : '是'}</div>
            </div>
            <div className="card">
              <div className="label">最近同步</div>
              <div className="value" style={{ fontSize: 18 }}>{status.last_sync_at || '—'}</div>
              <div className="hint">{status.last_sync_status || status.source || ''}</div>
            </div>
            <div className="card">
              <div className="label">用户同步</div>
              <div className="value">{status.users_synced ?? '—'}</div>
              <div className="hint">失败 {status.users_failed ?? 0}</div>
            </div>
            <div className="card">
              <div className="label">待停权</div>
              <div className="value">{status.pending_revokes ?? revokes.length}</div>
            </div>
          </div>
        )}
        {statusEntries.length > 0 && (
          <table>
            <thead>
              <tr><th>字段</th><th>值</th></tr>
            </thead>
            <tbody>
              {statusEntries.map(([k, v]) => (
                <tr key={k}>
                  <td><code>{k}</code></td>
                  <td>{stringifyCell(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!status && !statusError && <div className="empty">暂无状态</div>}
      </div>

      <div className="panel">
        <h2>导入 / 同步 3.0 用户 JSON</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          粘贴综合系统 3.0 导出的用户数组，或 <code>{'{ "users": [...] }'}</code>。提交调用
          {' '}<code>POST /api/v1/integration/sync/users</code>。
        </p>
        <form onSubmit={syncUsers}>
          <div className="toolbar">
            <label className="btn secondary" style={{ display: 'inline-block' }}>
              选择 JSON 文件
              <input type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            <button className="btn secondary" type="button" onClick={() => setJsonText(SAMPLE_USERS)}>填入示例</button>
            <span className={`tag ${parseHint.startsWith('可导入') ? 'ok' : 'bad'}`}>{parseHint}</span>
          </div>
          <div className="field">
            <label>用户 JSON</label>
            <textarea className="json" rows={12} value={jsonText} onChange={(e) => setJsonText(e.target.value)} spellCheck={false} />
          </div>
          <div className="toolbar" style={{ marginTop: 12 }}>
            <Perm code={BTN_PERM.integrationSync}>
              <button className="btn" type="submit" disabled={busy}>同步用户</button>
            </Perm>
          </div>
        </form>
        {syncResult && (
          <div className="alert info" style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
            结果：{JSON.stringify(syncResult, null, 2)}
          </div>
        )}
      </div>

      <div className="panel">
        <h2>开权前培训校验</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          介质接触岗申请 wipe / outbound 须完成 safety、sop、wipe_r2 且在有效期内。调用
          {' '}<code>POST /api/v1/integration/validate-training</code>，通过后再到
          {' '}<Link to="/permissions">开权审计</Link> 下发。
        </p>
        {validateError && <div className="alert error">{validateError}</div>}
        {validation && (
          <div className={`alert ${gatePassed ? 'success' : 'error'}`}>
            {gatePassed ? '培训闸门通过，可以开权。' : '培训闸门未通过，禁止开权。'}
            {' '}
            {validation.message || validation.reason || ''}
          </div>
        )}
        <div className="form-grid">
          <div className="field">
            <label>员工</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">未选择</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.emp_no}) {e.is_media_contact ? '[介质]' : ''} {e.is_critical_role ? '[关键]' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>拟申请 scopes</label>
            <div className="scopes">
              {ALL_SCOPES.map((s) => (
                <label key={s}>
                  <input
                    type="checkbox"
                    checked={scopes.includes(s)}
                    onChange={() => setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
        </div>
        {selected && (
          <div className="alert info" style={{ marginTop: 12 }}>
            {selected.name} · 介质接触={String(selected.is_media_contact)} · 综合账号={selected.system_account_id || '未绑定'}
          </div>
        )}
        <div className="toolbar" style={{ marginTop: 12 }}>
          <Perm code={BTN_PERM.integrationValidate}>
            <button className="btn" type="button" disabled={!employeeId || scopes.length === 0} onClick={validateTraining}>
              校验培训（开权前）
            </button>
          </Perm>
          <Link className="btn secondary" to="/trainings">去培训管理</Link>
        </div>
        {validation?.missing && Array.isArray(validation.missing) && validation.missing.length > 0 && (
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr><th>缺失项</th></tr>
            </thead>
            <tbody>
              {validation.missing.map((m, i) => (
                <tr key={i}><td>{typeof m === 'string' ? m : stringifyCell(m)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        {validation?.courses && validation.courses.length > 0 && (
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>课程</th>
                <th>状态</th>
                <th>有效期</th>
              </tr>
            </thead>
            <tbody>
              {validation.courses.map((c, i) => (
                <tr key={c.course_code || i}>
                  <td>{c.course_name || c.course_code}</td>
                  <td>{c.status || '—'}</td>
                  <td>{c.valid_until || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h2>待停权清单</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          <code>GET /api/v1/integration/revokes/pending</code>
        </p>
        {revokeError && <div className="alert error">{revokeError}</div>}
        {revokeFallback && <div className="alert info">{revokeFallback}</div>}
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>员工</th>
              <th>scopes</th>
              <th>状态</th>
              <th>trigger</th>
              <th>到期</th>
              <th>原因</th>
            </tr>
          </thead>
          <tbody>
            {revokes.map((x, i) => (
              <tr key={String(x.id ?? i)}>
                <td>{x.id ?? '—'}</td>
                <td>{x.name || x.emp_no || x.employee_id || '—'}</td>
                <td>{stringifyCell(x.scopes)}</td>
                <td><span className="tag warn">{String(x.status || '—')}</span></td>
                <td>{stringifyCell(x.trigger)}</td>
                <td>{stringifyCell(x.due_at)}</td>
                <td>{stringifyCell(x.reason)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {revokes.length === 0 && <div className="empty">暂无待停权</div>}
      </div>

      <div className="panel">
        <h2>权限回调日志</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          综合系统 3.0 开权/停权结果回写。调用 <code>GET /api/v1/integration/callbacks</code>；若后端尚未提供该路由，将显示下方错误而不阻断其他区块。
        </p>
        {callbackError && <div className="alert error">{callbackError}</div>}
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>方向</th>
              <th>事件</th>
              <th>状态</th>
              <th>账号</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            {callbacks.map((x, i) => (
              <tr key={String(x.id ?? i)}>
                <td>{stringifyCell(x.created_at)}</td>
                <td>{stringifyCell(x.direction)}</td>
                <td>{stringifyCell(x.event_type)}</td>
                <td>{stringifyCell(x.status)}</td>
                <td>{stringifyCell(x.system_account_id || x.employee_id)}</td>
                <td>{stringifyCell(x.message || x.payload)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {callbacks.length === 0 && !callbackError && <div className="empty">暂无回调日志</div>}
      </div>
    </div>
  )
}
