import { useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client'
import { Perm } from './Perm'
import type { WorkflowInstance } from '../api/types'

export function useBizWorkflow(businessType: string, businessId: number | undefined) {
  const [inst, setInst] = useState<WorkflowInstance | null>(null)
  const reload = async () => {
    if (!businessId) {
      setInst(null)
      return
    }
    const r = await api.get<WorkflowInstance[]>('/api/v1/workflows/instances', {
      params: { business_type: businessType, business_id: businessId },
    })
    setInst(r.data[0] || null)
  }
  useEffect(() => {
    reload().catch(() => setInst(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessType, businessId])
  return { inst, reload }
}

export function WorkflowStatus({ inst }: { inst: WorkflowInstance | null }) {
  if (!inst) return <span className="muted">未提交审批</span>
  return (
    <span className={`tag ${inst.status === 'approved' ? 'ok' : inst.status === 'rejected' ? 'bad' : 'blue'}`}>
      流#{inst.id} {inst.status}
      {inst.current_node_id ? ` @${inst.current_node_id}` : ''}
    </span>
  )
}

export function SubmitApprovalBtn({
  businessType,
  businessId,
  perm,
  disabled,
  onDone,
}: {
  businessType: string
  businessId: number
  perm: string
  disabled?: boolean
  onDone?: () => void
}) {
  const [err, setErr] = useState('')
  const submit = async () => {
    setErr('')
    try {
      await api.post('/api/v1/workflows/submit', {
        business_type: businessType,
        business_id: businessId,
      })
      onDone?.()
    } catch (e) {
      setErr(getErrorMessage(e))
    }
  }
  return (
    <Perm code={perm}>
      <button className="btn sm" disabled={disabled} onClick={submit}>提交审批</button>
      {err && <div className="alert error" style={{ marginTop: 4 }}>{err}</div>}
    </Perm>
  )
}
