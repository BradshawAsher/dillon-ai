import { supabase } from '../supabaseClient'

export type WatchdogEventItem = {
  id: number | string | null
  eventType: string
  documentId: string
  projectId: string
  dealName: string
  filename: string
  durationStuckMinutes: number | null
  actionTaken: string
  workflowId: string
  details: string
  status: string
  createdAt: string
}

export default async function getWatchdogEvents(req?: {
  params?: { environment?: 'production' | 'test'; limit?: number }
  user?: any
}): Promise<WatchdogEventItem[]> {
  const limit = req?.params?.limit ?? 100
  const { data: rows, error } = await supabase
    .from('watchdog_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn(`[Watchdog] Supabase read failed: ${error.message}`)
    return []
  }
  if (!rows) return []

  return (rows as Array<Record<string, any>>).map((row) => ({
    id: row.id ?? null,
    eventType: row.event_type ?? 'stuck_document_recovered',
    documentId: row.document_id ?? '',
    projectId: row.project_id ?? '',
    dealName: row.deal_name ?? '',
    filename: row.filename ?? '',
    durationStuckMinutes: typeof row.duration_stuck_minutes === 'number' ? row.duration_stuck_minutes : null,
    actionTaken: row.action_taken ?? '',
    workflowId: row.workflow_id ?? '',
    details: row.details ?? '',
    status: row.status ?? 'recovered',
    createdAt: row.created_at ?? new Date().toISOString(),
  }))
}
