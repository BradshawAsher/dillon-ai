import { supabase } from '../supabaseClient'

type Params = { projectId: string; environment?: 'production' | 'test' }

export default async function triggerProjectSynthesis(req: { params: Params; user: User }) {
  const projectId = req.params.projectId?.trim()
  if (!projectId) throw new Error('projectId is required')

  const path = req.params.environment === 'test'
    ? 'webhook-test/consolidate-project'
    : 'webhook/consolidate-project'

  // Update Supabase project_syntheses status to awaiting_synthesis so the dashboard immediately reacts
  try {
    await supabase
      .from('project_syntheses')
      .update({
        project_status: 'awaiting_synthesis',
        ai_error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
  } catch {
    // Non-fatal if record doesn't exist yet
  }

  // Dispatch to n8n consolidate-project webhook
  const response = await n8nFinancialAgent.rawRequest<{ ok?: boolean; message?: string }>({
    path,
    method: 'POST',
    bodyType: 'json',
    json: { projectId },
  })

  return { ok: true, projectId, status: 'started', data: response.data }
}
