# CINO 人事管理前端（cino-hr-web）

面向 `cino-hr-api` 的中文管理后台（Vite + React + TypeScript），作为 **V2.2 人事考核 + 对接综合系统 3.0** 的 HR Web。

## 功能

- 登录：本地账号 / SSO；请求头 `Authorization: Bearer <token>`（演示环境亦可配合后端 `demo-key`）
- 动态嵌套侧栏：`GET /api/v1/sys/menus/tree` + `hasPerm`；按钮级 `Perm` 包装
- 仪表盘、花名册、培训、开权审计、编制、招聘入职、合同、考勤、证据、工单、紧急用工、审批流、文件、通知、系统管理
- **人事KPI看板** `/kpi`：V2.2 计分卡 3.1–3.12（满分 100）、熔断旗标、按月跑批，条款链接到 employees / headcount / trainings / permissions 等表
- **对接中心** `/integration`：同步状态、粘贴/导入 3.0 用户 JSON、开权前培训校验、待停权、权限回调日志
- **对接说明** `/integration-guide`：HR vs 3.0 权责与跑批时间（次月 1 日 02:00）

## 启动

```bash
# 后端
cd /workspace/cino-hr-api
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 前端
cd /workspace/cino-hr-web
bun install   # 或 npm install
bun run dev   # 或 npm run dev
# 浏览器打开 http://127.0.0.1:5173
```

演示账号：`admin/admin123` · `hr/hr123` · `viewer/viewer123`。

API 基址：`http://127.0.0.1:8000`（Axios + Bearer；后端未启动时页面会提示无法连接）。

## V2.2 菜单 / 按钮权限码（RBAC seed）

与现有 `menu.*` / `btn.*` 种子一致：权限目录挂菜单码，按钮码作为子节点；角色勾选后动态侧栏与 `Perm` 才可见。`admin` 含 `*` 可访问全部。

| 权限码 | 类型 | 页面 / 动作 |
|--------|------|-------------|
| `menu.kpi` | 菜单 | 人事KPI看板 `/kpi`（已有，建议标题改为「人事KPI看板」） |
| `btn.kpi.run` | 按钮 | 触发月度跑批 |
| `menu.integration` | 菜单 | 对接中心 `/integration` |
| `btn.integration.sync` | 按钮 | 导入/同步综合系统 3.0 用户 |
| `btn.integration.validate` | 按钮 | 开权前培训校验 |
| `menu.integration.guide` | 菜单 | 对接说明 `/integration-guide` |

建议 seed 示例（嵌套分组）：

```text
分组「V2.2 考核与对接」  permission_code=menu.integration  path 空
  ├ 人事KPI看板   path=/kpi                 menu.kpi
  ├ 对接中心      path=/integration         menu.integration
  └ 对接说明      path=/integration-guide   menu.integration.guide
```

前端在 API 菜单树尚未包含上述 path、但当前用户已有对应 `menu.*`（或 `*`）时，会在侧栏追加「V2.2 考核与对接」分组，避免 seed 滞后无法进入页面。

### 约定 API（后端未上线也会调用，并显示「接口尚未就绪」）

| 方法 | 路径 | 用途 |
|------|------|------|
| `GET` | `/api/v1/integration/status` | 同步状态 |
| `POST` | `/api/v1/integration/sync/users` | 导入 3.0 用户 JSON |
| `POST` | `/api/v1/integration/validate-training` | 开权前培训闸门 |
| `GET` | `/api/v1/integration/revokes/pending` | 待停权 |
| `GET` | `/api/v1/integration/callbacks` | 权限回调日志 |
| `POST` | `/api/v1/kpi/batch/{yyyy-mm}/run` | 月度跑批（已有） |
| `GET` | `/api/v1/kpi/scores?year_month=` | 得分明细（已有） |
| `GET` | `/api/v1/kpi/scorecard?year_month=` | V2.2 计分卡（可选） |
| `GET` | `/api/v1/kpi/meltdown?year_month=` | 熔断旗标（可选） |

用户 JSON 可为数组或 `{ "users": [ { "system_account_id", "emp_no", "name", ... } ] }`。

跑批时间：人事考核默认 **次月 1 日 02:00** 执行上月计分卡；可在看板手工触发。

计分卡条款 3.1–3.12（权重合计 100，熔断项：3.7 / 3.8 / 3.11）定义见 `src/config/kpiScorecard.ts`。

## 目录

```
src/
  api/         Axios 客户端与类型
  auth/        登录态与 hasPerm
  config/      RBAC 码、V2.2 计分卡
  components/  侧边栏、Perm 按钮包装
  pages/       各业务页（含 Integration / Kpi / IntegrationGuide）
  styles/      全局样式
```
