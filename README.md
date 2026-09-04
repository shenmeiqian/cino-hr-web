# CINO 人事管理前端（cino-hr-web）

面向 `/workspace/cino-hr-api` 的中文管理后台 MVP（Vite + React + TypeScript）。

## 功能

- 仪表盘：员工数、关键岗、待闭环考勤、开权提示
- 员工花名册：列表 / 新建 / 编辑（含 `system_account_id`、关键岗、介质接触岗）
- 培训：列表、登记通过与有效期
- 权限：开权（scopes：wipe/outbound/erp/wms）、展示 403 中文错误、停权
- 编制/岗位：列表查看
- KPI：按月份跑批，展示人事主管得分

## 启动

```bash
# 后端
cd /workspace/cino-hr-api
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 前端
cd /workspace/cino-hr-web
bun install
bun run dev
# 浏览器打开 http://127.0.0.1:5173
```

## 鉴权说明

演示环境前端已内置请求头 `X-API-Key: demo-key`，**无需登录页面**。

API 基址：`http://127.0.0.1:8000`

## 目录

```
src/
  api/         Axios 客户端与类型
  components/  侧边栏布局
  pages/       各业务页
  styles/      全局样式
```
