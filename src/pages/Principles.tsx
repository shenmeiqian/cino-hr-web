export default function Principles() {
  const modules = [
    { code: 'T01', name: '员工花名册', p: 'P0' },
    { code: 'T02', name: '编制计划', p: 'P0' },
    { code: 'T03', name: '岗位与 JD 条款', p: 'P0' },
    { code: 'T04', name: '招聘闭环', p: 'P0' },
    { code: 'T05', name: '入职单', p: 'P0' },
    { code: 'T06', name: '合同社保', p: 'P0' },
    { code: 'T07', name: '培训管理', p: 'P0' },
    { code: 'T08', name: '权限开权/停权', p: 'P0' },
    { code: 'T09', name: '考勤异常', p: 'P0' },
    { code: 'T10', name: '绩效映射', p: 'P1' },
    { code: 'T11', name: '人事主管 KPI 跑批', p: 'P0' },
    { code: 'T12', name: '人事工单', p: 'P1' },
    { code: 'T13', name: '紧急用工审批', p: 'P1' },
    { code: 'T14', name: 'R2/ISO 证据', p: 'P0' },
    { code: 'T15', name: 'KPI 看板', p: 'P0' },
  ]

  return (
    <div>
      <div className="panel">
        <h2>00_目录与原则（摘要）</h2>
        <div className="alert info">
          本页汇总 CINO 人事微服务字段表 T01–T15 的目录优先级与关键规则，便于运营与研发对齐。
        </div>
        <h2 style={{ marginTop: 16 }}>关键规则</h2>
        <ul style={{ lineHeight: 1.8, margin: '8px 0 0', paddingLeft: 20 }}>
          <li><strong>先定岗后进人</strong>：编制与岗位（T02/T03）就绪后，再发起招聘与入职。</li>
          <li><strong>T+0</strong>：关键人事事件（入职、开权、停权、紧急审批）当日闭环，不跨自然日积压。</li>
          <li><strong>跑批次</strong>：人事主管 KPI 跑批默认每月 <strong>1 日 02:00</strong> 执行（可手工触发）。</li>
          <li><strong>培训前置</strong>：媒体联络 / wipe·outbound 等高风险权限须完成 safety / sop / wipe_r2 且在有效期内。</li>
          <li><strong>证据留存</strong>：R2/ISO 相关操作须挂接证据（T14），可追溯审计。</li>
        </ul>
      </div>
      <div className="panel">
        <h2>模块清单 T01–T15</h2>
        <table>
          <thead>
            <tr>
              <th>编码</th>
              <th>模块</th>
              <th>优先级</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m.code}>
                <td>{m.code}</td>
                <td>{m.name}</td>
                <td>
                  <span className={`tag ${m.p === 'P0' ? 'ok' : 'warn'}`}>{m.p}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
