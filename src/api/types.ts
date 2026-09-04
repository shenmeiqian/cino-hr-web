export interface Employee {
  id: number
  emp_no: string
  name: string
  dept_id?: number | null
  position_id?: number | null
  system_account_id?: string | null
  status: string
  hire_date?: string | null
  leave_date?: string | null
  is_media_contact: boolean
  is_critical_role: boolean
  phone?: string | null
  email?: string | null
  remark?: string | null
}

export interface Training {
  id: number
  employee_id: number
  course_code: string
  course_name: string
  status: string
  score?: number | null
  trained_at?: string | null
  valid_until?: string | null
  remark?: string | null
}

export interface PermissionEvent {
  id: number
  employee_id: number
  event_type: string
  scopes: string
  reason?: string | null
  trigger?: string | null
  status: string
  due_at?: string | null
  completed_at?: string | null
  operator?: string | null
  created_at?: string | null
}

export interface Headcount {
  id: number
  year_month: string
  dept_id?: number | null
  position_id?: number | null
  planned_count: number
  actual_count: number
  vacancy: number
  status: string
  remark?: string | null
}

export interface Position {
  id: number
  code: string
  title: string
  dept_id?: number | null
  level?: string | null
  is_universal_temp: boolean
  jd_summary?: string | null
  status: string
  clauses?: Array<{
    id: number
    clause_code: string
    clause_title: string
    content?: string | null
  }>
}

export interface AttendanceException {
  id: number
  employee_id: number
  exception_date: string
  exception_type: string
  minutes: number
  status: string
  remark?: string | null
}

export interface HrManagerScore {
  id: number
  year_month: string
  kpi_code: string
  kpi_name: string
  raw_value: number
  score: number
  weight: number
  weighted_score: number
  detail?: string | null
}

export interface KpiRunResult {
  year_month: string
  batch_id: number
  scores: HrManagerScore[]
  total_weighted_score: number
}

export interface Department {
  id: number
  code: string
  name: string
}

export interface RecruitingReq {
  id: number
  req_no: string
  position_id?: number | null
  dept_id?: number | null
  headcount: number
  status: string
  owner_emp_id?: number | null
  open_date?: string | null
  close_date?: string | null
  remark?: string | null
  created_at?: string | null
}

export interface Onboarding {
  id: number
  employee_id: number
  plan_start?: string | null
  actual_start?: string | null
  buddy_emp_id?: number | null
  checklist_status: string
  account_bound: boolean
  remark?: string | null
  created_at?: string | null
}

export interface Contract {
  id: number
  employee_id: number
  contract_no: string
  contract_type: string
  start_date?: string | null
  end_date?: string | null
  status: string
  file_url?: string | null
  remark?: string | null
  created_at?: string | null
}

export interface Evidence {
  id: number
  ref_type: string
  ref_id: number
  employee_id?: number | null
  title: string
  file_url?: string | null
  content?: string | null
  uploaded_by?: string | null
  created_at?: string | null
}

export interface Ticket {
  id: number
  ticket_no: string
  category: string
  title: string
  description?: string | null
  requester_emp_id?: number | null
  assignee_emp_id?: number | null
  status: string
  priority: string
  created_at?: string | null
}

export interface EmergencyApproval {
  id: number
  approval_no: string
  employee_id?: number | null
  reason: string
  scopes?: string | null
  status: string
  approver?: string | null
  decided_at?: string | null
  created_at?: string | null
}

export interface WorkflowNode {
  id: string
  type: 'start' | 'approval' | 'condition' | 'end'
  label: string
  x: number
  y: number
  approverRole?: string
  config?: Record<string, unknown>
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface WorkflowDefinition {
  id: number
  code: string
  name: string
  description?: string | null
  status: string
  nodes_json: string
  edges_json: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  created_at?: string | null
  updated_at?: string | null
}

export interface WorkflowInstance {
  id: number
  definition_id: number
  business_type: string
  business_id: number
  status: string
  current_node_id?: string | null
  created_at?: string | null
}
