import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import { Perm } from '../components/Perm'

type Log = {
  id: number
  channel: string
  to_addr: string
  title: string
  body?: string
  status: string
  error?: string
  created_at?: string
}

export default function Notifications() {
  const [list, setList] = useState<Log[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [form, setForm] = useState({ channel: 'email', to: 'demo@cino.demo', title: '测试通知', body: 'hello' })

  const load = async () => {
    const r = await api.get<Log[]>('/api/v1/notifications')
    setList(r.data)
  }
  useEffect(() => {
    load().catch((e) => setError(getErrorMessage(e)))
  }, [])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/v1/notifications/send', form)
      setOk('已发送（或 dry-run 记录）')
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert success">{ok}</div>}
      <div className="panel">
        <Perm code="btn.notifications.send">
          <form onSubmit={send} className="form-grid" style={{ marginBottom: 16 }}>
            <div className="field">
              <label>渠道</label>
              <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                <option value="email">email</option>
                <option value="sms">sms</option>
                <option value="wecom">wecom</option>
                <option value="dingtalk">dingtalk</option>
                <option value="feishu">feishu</option>
              </select>
            </div>
            <div className="field"><label>收件人</label><input value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></div>
            <div className="field"><label>标题</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="field"><label>内容</label><input value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <button className="btn" type="submit">测试发送</button>
          </form>
        </Perm>
        <table>
          <thead><tr><th>ID</th><th>渠道</th><th>收件人</th><th>标题</th><th>状态</th><th>错误</th></tr></thead>
          <tbody>
            {list.map((l) => (
              <tr key={l.id}>
                <td>{l.id}</td>
                <td>{l.channel}</td>
                <td>{l.to_addr}</td>
                <td>{l.title}</td>
                <td><span className={`tag ${l.status === 'sent' ? 'ok' : l.status === 'failed' ? 'bad' : 'warn'}`}>{l.status}</span></td>
                <td>{l.error || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
