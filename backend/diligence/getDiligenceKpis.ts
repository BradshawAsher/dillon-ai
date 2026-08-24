import { supabase } from '../supabaseClient'

type Params = {
    environment?: 'production' | 'test'
    projectId?: string
}

export async function getDiligenceKpis({ params }: { params?: Params; user?: unknown } = {}) {
    const environment = params?.environment === 'test' ? 'test' : 'production'
    const projectId = typeof params?.projectId === 'string' ? params.projectId.trim() : ''

    if (projectId) {
        const { data, error } = await supabase.rpc('get_project_diligence_kpis', {
            p_project_id: projectId,
            p_environment: environment,
        })
        if (error) {
            console.error('[getDiligenceKpis] Supabase RPC error:', error)
            throw error
        }
        return data
    }

    const { data, error } = await supabase.rpc('get_portfolio_diligence_kpis', {
        p_environment: environment,
    })
    if (error) {
        console.error('[getDiligenceKpis] Supabase RPC error:', error)
        throw error
    }
    return data
}
