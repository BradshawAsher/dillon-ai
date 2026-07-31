import { supabase } from '../supabaseClient'

type Params = { projectId: string }

export default async function getProjectActionTracker(req: { params: Params; user: User }) {
  const projectId = req.params.projectId?.trim()
  if (!projectId) throw new Error('projectId is required')

  const { data: rows, error } = await supabase
    .from('project_action_trackers')
    .select('*')
    .eq('project_id', projectId)
    .limit(1)

  if (error) throw new Error(`Supabase read failed: ${error.message}`)
  if (!rows || rows.length === 0) return null

  const row = rows[0]
  return {
    projectId: row.project_id ?? '',
    checklistJson: row.checklist_json ?? '[]',
    questionsJson: row.questions_json ?? '[]',
    lastModifiedAt: row.last_modified_at ?? '',
    lastModifiedBy: row.last_modified_by ?? '',
  }
}
