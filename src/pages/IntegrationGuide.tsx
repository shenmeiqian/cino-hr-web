import { Link } from 'react-router-dom'

export default function IntegrationGuide() {
  return (
    <div>
      <div className="panel">
        <h2>对接说明 · 人事系统 vs 综合系统 3.0</h2>
        <div className="alert info">
          人事微服务（cino-hr）是编制、花名册、培训闸门与考核的主数据；综合系统 3.0 负责账号生命周期与业务系统权限落地。两边通过
          {' '}<code>system_account_id</code> 对齐，禁止在 3.0 侧绕过培训闸门直接开高风险权限。
        </div>
        <p className="muted">
          相关页面：<Link to="/integration">对接中心</Link>
          {' · '}<Link to="/kpi">人事KPI看板</Link>
          {' · '}<Link to="/permissions">开权审计</Link>
          {' · '}<Link to="/trainings">培训管理</Link>
        </p>
      </div>

      <div className="panel">
        <h2>权责边界</h2>
        <table>
          <thead>
            <tr>
              <th>事项</th>
              <th>人事系统（HR / cino-hr）</th>
              <th>综合系统 3.0</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>组织与编制</td>
              <td>部门、岗位、编制计划、关键岗标识（主数据）</td>
              <td>只读同步组织编码；不改编制</td>
            </tr>
            <tr>
              <td>人员主数据</td>
              <td>花名册、入离职、合同社保、工号</td>
              <td>接收用户 JSON / 账号启用停用</td>
            </tr>
            <tr>
              <td>账号</td>
              <td>维护 <code>system_account_id</code> 绑定关系</td>
              <td>创建/回收登录账号与 SSO</td>
            </tr>
            <tr>
              <td>培训</td>
              <td>登记 safety / sop / wipe_r2 及有效期（开权前置条件）</td>
              <td>不判定培训；开权前应回调人事校验</td>
            </tr>
            <tr>
              <td>开权 / 停权</td>
              <td>闸门校验、审计事件、待停权 SLA、熔断取数</td>
              <td>按回调结果下发 wipe / outbound / erp / wms 等 scopes</td>
            </tr>
            <tr>
              <td>证据</td>
              <td>R2/ISO 证据挂接与考核条款 3.11</td>
              <td>可回传操作日志，不替代人事证据库</td>
            </tr>
            <tr>
              <td>人事考核</td>
              <td>V2.2 计分卡 3.1–3.12 跑批与看板</td>
              <td>不计算人事 KPI</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>跑批时间</h2>
        <ul style={{ lineHeight: 1.8, margin: '8px 0 0', paddingLeft: 20 }}>
          <li>
            人事主管 KPI 默认于<strong>次月 1 日 02:00</strong>自动跑批（考核上一个自然月）。
          </li>
          <li>
            可在「人事KPI看板」手工触发 <code>POST /api/v1/kpi/batch/&#123;yyyy-mm&#125;/run</code>。
          </li>
          <li>
            熔断条款（3.7 开权闸门、3.8 停权 SLA、3.11 证据完整）未达标时，当月考核按熔断处理。
          </li>
        </ul>
      </div>

      <div className="panel">
        <h2>同步约定</h2>
        <ul style={{ lineHeight: 1.8, margin: '8px 0 0', paddingLeft: 20 }}>
          <li>
            用户导入：<code>POST /api/v1/integration/sync/users</code>，Body 为用户数组或 <code>{'{ "users": [...] }'}</code>。
          </li>
          <li>
            开权前校验：<code>POST /api/v1/integration/validate-training</code>（employee_id + scopes）。
          </li>
          <li>
            待停权：<code>GET /api/v1/integration/revokes/pending</code>；3.0 完成后应回调人事关闭 SLA。
          </li>
          <li>
            回调日志：<code>GET /api/v1/integration/callbacks</code>（若路由尚未上线，对接中心会明确提示接口未就绪）。
          </li>
        </ul>
      </div>
    </div>
  )
}
