import { supabase } from '../supabaseClient'

type Params = { projectId: string; checklistJson?: string; questionsJson?: string }

export default async function saveProjectActionTracker(req: { params: Params; user: User }) {
  const projectId = req.params.projectId?.trim()
  if (!projectId) throw new Error('projectId is required')

  const row = {
    project_id: projectId,
    checklist_json: req.params.checklistJson ?? '[]',
    questions_json: req.params.questionsJson ?? '[]',
    last_modified_at: new Date().toISOString(),
    last_modified_by: req.user.email ?? '',
  }

  const { data, error } = await supabase
    .from('project_action_trackers')
    .upsert(row, { onConflict: 'project_id' })
    .select()
    .single()

  if (error) throw new Error(`Supabase write failed: ${error.message}`)
  return data
}
