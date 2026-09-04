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
