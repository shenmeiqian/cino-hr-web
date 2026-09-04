import { FormEvent, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api, getErrorMessage } from '../api/client'

export default function Login() {
  const { token, login, ready } = useAuth()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [sso, setSso] = useState<{ configured: boolean; hint?: string } | null>(null)

  useEffect(() => {
    api.get('/api/v1/auth/sso/status').then((r) => setSso(r.data)).catch(() => setSso({ configured: false }))
  }, [])

  if (ready && token) return <Navigate to="/" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(username, password)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="login-page">
      <div className="login-card panel">
        <h1>CINO 人事管理</h1>
        <p className="muted">本地账号登录 · 动态菜单 / 按钮权限</p>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>用户名</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>密码</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn" type="submit" style={{ width: '100%', marginTop: 12 }}>登录</button>
        </form>
        <div style={{ marginTop: 16 }}>
          {sso?.configured ? (
            <a className="btn secondary" style={{ display: 'block', textAlign: 'center' }} href="http://127.0.0.1:8000/api/v1/auth/sso/login">
              SSO 登录
            </a>
          ) : (
            <button className="btn secondary" type="button" disabled title={sso?.hint || '未配置 SSO'}>
              SSO 登录（未配置）
            </button>
          )}
          {!sso?.configured && (
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              需配置 OIDC_ISSUER / OIDC_CLIENT_ID / OIDC_CLIENT_SECRET
            </p>
          )}
        </div>
        <div className="alert info" style={{ marginTop: 16, fontSize: 12 }}>
          演示账号：admin/admin123 · hr/hr123 · viewer/viewer123
        </div>
      </div>
    </div>
  )
}
