import { supabase } from '../supabaseClient'

type Params = { projectId: string; environment?: 'production' | 'test' }

export default async function stopProjectSynthesis(req: { params: Params; user: User }) {
    const projectId = req.params.projectId?.trim()
    if (!projectId) throw new Error('projectId is required')

    const { error } = await supabase
        .from('project_syntheses')
        .update({
            project_status: 'stopped',
            ai_error_message: 'Synthesis was stopped by the user.',
            updated_at: new Date().toISOString(),
        })
        .eq('project_id', projectId)

    if (error) throw new Error(`Supabase write failed: ${error.message}`)
    return { ok: true, projectId, status: 'stopped' }
}
