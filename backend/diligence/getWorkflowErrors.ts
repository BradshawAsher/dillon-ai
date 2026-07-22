type ErrorAuditRow = { id?: number | string; occurredAt?: string; workflowId?: string; workflowName?: string; executionId?: string; failedNode?: string; errorMessage?: string; lastNodeExecuted?: string; severity?: string }
type ErrorAuditResponse = ErrorAuditRow[] | { errors?: ErrorAuditRow[]; rows?: ErrorAuditRow[]; data?: ErrorAuditRow[]; items?: ErrorAuditRow[] }
export type WorkflowErrorItem = { id: number | string | null; occurredAt: string; workflowId: string; workflowName: string; executionId: string; failedNode: string; errorMessage: string; lastNodeExecuted: string; severity: string }

export default async function getWorkflowErrors(req: { params: { environment?: 'production' | 'test' }; user: User }) {
  const path = req.params.environment === 'test' ? 'webhook-test/dd-workflow-errors' : 'webhook/dd-workflow-errors'
  const response = await n8nFinancialAgent.rawRequest<ErrorAuditResponse>({ path, method: 'GET' })
  const payload = response.data
  const rows = Array.isArray(payload) ? payload : payload.errors ?? payload.rows ?? payload.data ?? payload.items ?? []
  return rows.map((row) => ({ id: row.id ?? null, occurredAt: String(row.occurredAt ?? ''), workflowId: String(row.workflowId ?? ''), workflowName: String(row.workflowName ?? ''), executionId: String(row.executionId ?? ''), failedNode: String(row.failedNode ?? ''), errorMessage: String(row.errorMessage ?? ''), lastNodeExecuted: String(row.lastNodeExecuted ?? ''), severity: String(row.severity ?? 'uncaught') }))
}
