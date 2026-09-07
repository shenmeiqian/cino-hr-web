/**
 * V2.2 菜单 / 按钮权限码，与后端 sys_permissions + menus seed 对齐。
 * 动态侧栏只渲染 /api/v1/sys/menus/tree；此处供路由 Guard、Perm 与 README 共用。
 */
export const MENU_PERM = {
  dashboard: 'menu.dashboard',
  todos: 'menu.todos',
  principles: 'menu.principles',
  employees: 'menu.employees',
  trainings: 'menu.trainings',
  permissions: 'menu.permissions',
  org: 'menu.org',
  kpi: 'menu.kpi',
  recruiting: 'menu.recruiting',
  onboarding: 'menu.onboarding',
  contracts: 'menu.contracts',
  attendance: 'menu.attendance',
  evidences: 'menu.evidences',
  tickets: 'menu.tickets',
  emergency: 'menu.emergency',
  workflows: 'menu.workflows',
  files: 'menu.files',
  notifications: 'menu.notifications',
  integration: 'menu.integration',
  integrationGuide: 'menu.integration.guide',
  sysUsers: 'menu.sys.users',
  sysRoles: 'menu.sys.roles',
  sysPermissions: 'menu.sys.permissions',
  sysMenus: 'menu.sys.menus',
} as const

export const BTN_PERM = {
  kpiRun: 'btn.kpi.run',
  integrationSync: 'btn.integration.sync',
  integrationValidate: 'btn.integration.validate',
} as const
