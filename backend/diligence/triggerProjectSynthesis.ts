import { supabase } from '../supabaseClient'

type Params = {
  projectId: string
  environment?: 'production' | 'test'
  userAnthropicApiKey?: string
  userOpenAiApiKey?: string
  userGeminiApiKey?: string
  userDeepseekApiKey?: string
  userApiKey?: string
  userProvider?: string
  synthPrimaryModel?: string
  synthBackupModel?: string
}

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
    json: {
      projectId,
      userAnthropicApiKey: req.params.userAnthropicApiKey || '',
      userOpenAiApiKey: req.params.userOpenAiApiKey || '',
      userGeminiApiKey: req.params.userGeminiApiKey || '',
      userDeepseekApiKey: req.params.userDeepseekApiKey || '',
      userApiKey: req.params.userApiKey || '',
      userProvider: req.params.userProvider || '',
      synthPrimaryModel: req.params.synthPrimaryModel || '',
      synthBackupModel: req.params.synthBackupModel || '',
    },
  })

  return { ok: true, projectId, status: 'started', data: response.data }
}
