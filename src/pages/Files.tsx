import { FormEvent, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import { Perm } from '../components/Perm'

type FileRow = {
  id: number
  filename: string
  content_type?: string
  size: number
  storage_backend: string
  uploaded_by?: string
  created_at?: string
}

export default function Files() {
  const [list, setList] = useState<FileRow[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const load = async () => {
    const r = await api.get<FileRow[]>('/api/v1/files')
    setList(r.data)
  }
  useEffect(() => {
    load().catch((e) => setError(getErrorMessage(e)))
  }, [])

  const upload = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    try {
      await api.post('/api/v1/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setOk('上传成功')
      setFile(null)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const downloadBlob = async (id: number, filename: string) => {
    const r = await api.get(`/api/v1/files/${id}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(r.data)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const remove = async (id: number) => {
    try {
      await api.delete(`/api/v1/files/${id}`)
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
        <p className="muted">存储后端由环境变量 <code>FILE_STORAGE_BACKEND=local|s3|database</code> 控制（默认 local）。S3 需配置 S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY/S3_SECRET_KEY。</p>
        <Perm code="btn.files.upload">
          <form className="toolbar" onSubmit={upload}>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button className="btn" type="submit" disabled={!file}>上传</button>
          </form>
        </Perm>
        <table>
          <thead>
            <tr><th>ID</th><th>文件名</th><th>大小</th><th>后端</th><th>上传人</th><th>操作</th></tr>
          </thead>
          <tbody>
            {list.map((f) => (
              <tr key={f.id}>
                <td>{f.id}</td>
                <td>{f.filename}</td>
                <td>{f.size}</td>
                <td>{f.storage_backend}</td>
                <td>{f.uploaded_by || '-'}</td>
                <td>
                  <button className="btn sm secondary" onClick={() => downloadBlob(f.id, f.filename)}>下载</button>{' '}
                  <Perm code="btn.files.delete">
                    <button className="btn sm danger" onClick={() => remove(f.id)}>删除</button>
                  </Perm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty">暂无文件</div>}
      </div>
    </div>
  )
}
