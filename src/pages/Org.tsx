import { useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import type { Department, Headcount, Position } from '../api/types'

export default function Org() {
  const [headcounts, setHeadcounts] = useState<Headcount[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const [h, p, d] = await Promise.all([
          api.get<Headcount[]>('/api/v1/headcounts'),
          api.get<Position[]>('/api/v1/positions'),
          api.get<Department[]>('/api/v1/departments'),
        ])
        setHeadcounts(h.data)
        setPositions(p.data)
        setDepts(d.data)
      } catch (err) {
        setError(getErrorMessage(err))
      }
    })()
  }, [])

  const deptName = (id?: number | null) => depts.find((d) => d.id === id)?.name || '-'
  const posName = (id?: number | null) => positions.find((p) => p.id === id)?.title || '-'

  return (
    <div>
      {error && <div className="alert error">{error}</div>}
      <div className="panel">
        <h2>编制计划（T02）</h2>
        <table>
          <thead>
            <tr>
              <th>月份</th>
              <th>部门</th>
              <th>岗位</th>
              <th>计划</th>
              <th>实际</th>
              <th>空缺</th>
              <th>状态</th>
              <th>备注</th>
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
        <h2>岗位 / JD（T03）</h2>
        <table>
          <thead>
            <tr>
              <th>编码</th>
              <th>名称</th>
              <th>部门</th>
              <th>级别</th>
              <th>通用临时岗</th>
              <th>状态</th>
              <th>JD 摘要</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.id}>
                <td>{p.code}</td>
                <td>{p.title}</td>
                <td>{deptName(p.dept_id)}</td>
                <td>{p.level || '-'}</td>
                <td>{p.is_universal_temp ? '是' : '否'}</td>
                <td><span className="tag">{p.status}</span></td>
                <td>{p.jd_summary || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {positions.length === 0 && <div className="empty">暂无岗位</div>}
      </div>
    </div>
  )
}
