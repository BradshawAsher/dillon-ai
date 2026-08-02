import { supabase } from '../supabaseClient'

export type WorkflowErrorItem = {
  id: number | string | null
  occurredAt: string
  workflowId: string
  workflowName: string
  executionId: string
  failedNode: string
  errorMessage: string
  lastNodeExecuted: string
  severity: string
}

export default async function getWorkflowErrors(req: {
  params: { environment?: 'production' | 'test' }
  user: User
}): Promise<WorkflowErrorItem[]> {
  const { data: rows, error } = await supabase
    .from('workflow_errors')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error(`Supabase read failed: ${error.message}`)
  if (!rows) return []

  return (rows as Array<Record<string, any>>).map((row) => ({
    id: row.id ?? null,
    occurredAt: row.occurred_at ?? '',
    workflowId: row.workflow_id ?? '',
    workflowName: row.workflow_name ?? '',
    executionId: row.execution_id ?? '',
    failedNode: row.failed_node ?? '',
    errorMessage: row.error_message ?? '',
    lastNodeExecuted: row.last_node_executed ?? '',
    severity: row.severity ?? 'uncaught',
  }))
}
