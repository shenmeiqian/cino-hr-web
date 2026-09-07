/** V2.2 人事主管考核计分卡（条款 3.1–3.12，满分 100）。 */

export type KpiDataSource = {
  label: string
  path: string
  table: string
}

export type ScorecardItemDef = {
  clause: string
  /** 归一化编码，用于匹配 API 的 kpi_code */
  code: string
  aliases: string[]
  name: string
  weight: number
  meltDown: boolean
  source: KpiDataSource
  hint: string
}

export const SCORECARD_MAX = 100

export const V22_SCORECARD: ScorecardItemDef[] = [
  {
    clause: '3.1',
    code: '3.1',
    aliases: ['kpi.3.1', 'kpi_3_1', 'hr-3.1', 'headcount', 'hc_fill'],
    name: '编制到位率',
    weight: 10,
    meltDown: false,
    source: { label: '编制与岗位', path: '/org', table: 'headcounts' },
    hint: '计划编制 vs 实际在岗，空缺计入扣分。',
  },
  {
    clause: '3.2',
    code: '3.2',
    aliases: ['kpi.3.2', 'kpi_3_2', 'hr-3.2', 'roster', 'employees'],
    name: '花名册准确率',
    weight: 8,
    meltDown: false,
    source: { label: '员工花名册', path: '/employees', table: 'employees' },
    hint: '工号/账号/在职状态与综合系统一致。',
  },
  {
    clause: '3.3',
    code: '3.3',
    aliases: ['kpi.3.3', 'kpi_3_3', 'hr-3.3', 'recruiting'],
    name: '招聘闭环及时率',
    weight: 8,
    meltDown: false,
    source: { label: '招聘入职闭环', path: '/recruiting', table: 'recruiting' },
    hint: '需求→入职闭环周期达标。',
  },
  {
    clause: '3.4',
    code: '3.4',
    aliases: ['kpi.3.4', 'kpi_3_4', 'hr-3.4', 'onboarding'],
    name: '入职 T+0 完成率',
    weight: 8,
    meltDown: false,
    source: { label: '入职单', path: '/onboarding', table: 'onboardings' },
    hint: '入职手续当日闭环，不跨自然日积压。',
  },
  {
    clause: '3.5',
    code: '3.5',
    aliases: ['kpi.3.5', 'kpi_3_5', 'hr-3.5', 'contracts'],
    name: '合同社保合规率',
    weight: 8,
    meltDown: false,
    source: { label: '合同社保', path: '/contracts', table: 'contracts' },
    hint: '合同签署与社保缴纳无差错。',
  },
  {
    clause: '3.6',
    code: '3.6',
    aliases: ['kpi.3.6', 'kpi_3_6', 'hr-3.6', 'training', 'trainings'],
    name: '培训有效覆盖率',
    weight: 10,
    meltDown: false,
    source: { label: '培训管理', path: '/trainings', table: 'trainings' },
    hint: 'safety / sop / wipe_r2 在有效期内。',
  },
  {
    clause: '3.7',
    code: '3.7',
    aliases: ['kpi.3.7', 'kpi_3_7', 'hr-3.7', 'grant', 'training_gate'],
    name: '开权培训闸门合规',
    weight: 10,
    meltDown: true,
    source: { label: '开权审计日志', path: '/permissions', table: 'permissions' },
    hint: '介质接触岗 wipe/outbound 须培训通过；违规开权触发熔断。',
  },
  {
    clause: '3.8',
    code: '3.8',
    aliases: ['kpi.3.8', 'kpi_3_8', 'hr-3.8', 'revoke', 'revoke_sla'],
    name: '停权 SLA 及时率',
    weight: 10,
    meltDown: true,
    source: { label: '开权审计日志', path: '/permissions', table: 'permissions' },
    hint: '离职/项目结束须按时停权；超时触发熔断。',
  },
  {
    clause: '3.9',
    code: '3.9',
    aliases: ['kpi.3.9', 'kpi_3_9', 'hr-3.9', 'attendance'],
    name: '考勤异常闭环率',
    weight: 8,
    meltDown: false,
    source: { label: '考勤异常', path: '/attendance', table: 'attendance-exceptions' },
    hint: 'open/pending 异常须当月闭环。',
  },
  {
    clause: '3.10',
    code: '3.10',
    aliases: ['kpi.3.10', 'kpi_3_10', 'hr-3.10', 'critical_role'],
    name: '关键岗覆盖与备份',
    weight: 6,
    meltDown: false,
    source: { label: '员工花名册', path: '/employees', table: 'employees' },
    hint: '关键岗在册且有备份安排。',
  },
  {
    clause: '3.11',
    code: '3.11',
    aliases: ['kpi.3.11', 'kpi_3_11', 'hr-3.11', 'evidence', 'r2'],
    name: 'R2/ISO 证据完整率',
    weight: 8,
    meltDown: true,
    source: { label: 'R2/ISO 证据', path: '/evidences', table: 'evidences' },
    hint: '擦除等高风险操作须挂接可追溯证据；缺失触发熔断。',
  },
  {
    clause: '3.12',
    code: '3.12',
    aliases: ['kpi.3.12', 'kpi_3_12', 'hr-3.12', 'integration', 'account_sync'],
    name: '综合系统3.0账号一致性',
    weight: 6,
    meltDown: false,
    source: { label: '对接中心', path: '/integration', table: 'integration' },
    hint: 'system_account_id 与 3.0 用户同步一致。',
  },
]

export function normalizeKpiCode(code: string | undefined | null): string {
  return String(code || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '.')
}

function clauseSuffix(normalized: string, clause: string): boolean {
  const c = normalizeKpiCode(clause).replace('.', '\\.')
  return new RegExp(`(?:^|[.\\-])${c}$`).test(normalized)
}

export function matchScorecardDef(kpiCode: string, kpiName?: string | null): ScorecardItemDef | undefined {
  const n = normalizeKpiCode(kpiCode)
  const byCode = V22_SCORECARD.find(
    (d) =>
      n === d.code ||
      n === normalizeKpiCode(d.clause) ||
      d.aliases.some((a) => normalizeKpiCode(a) === n) ||
      clauseSuffix(n, d.clause),
  )
  if (byCode) return byCode
  if (!kpiName) return undefined
  return V22_SCORECARD.find((d) => kpiName.includes(d.name) || d.name.includes(kpiName))
}

export const WEIGHT_SUM = V22_SCORECARD.reduce((s, d) => s + d.weight, 0)
