import { supabase } from '../supabaseClient'

export type EvalRunRecord = {
    id: number
    run_at: string
    commit_sha: string
    total_documents: number
    passed_documents: number
    overall_percentage: number
    status: string
    report_json: any
}

export default async function getEvalRuns() {
    const { data: rows, error } = await supabase
        .from('eval_runs')
        .select('*')
        .order('run_at', { ascending: false })
        .limit(50)

    if (error) {
        console.warn('Supabase eval_runs fetch failed or table missing:', error.message)
        return []
    }

    return (rows as EvalRunRecord[]) || []
}
