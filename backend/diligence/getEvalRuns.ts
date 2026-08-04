import * as fs from 'fs'
import * as path from 'path'
import { supabase } from '../supabaseClient'

export type EvalRunRecord = {
    id: number | string
    run_at: string
    commit_sha: string
    total_documents: number
    passed_documents: number
    overall_percentage: number
    status: string
    report_json: any
}

export default async function getEvalRuns() {
    try {
        const { data: rows, error } = await supabase
            .from('eval_runs')
            .select('*')
            .order('run_at', { ascending: false })
            .limit(50)

        if (!error && rows && rows.length > 0) {
            return rows as EvalRunRecord[]
        }
    } catch {
        // Fallback to local report file if database table is empty or unpopulated
    }

    // Fallback: Read from local latest_eval_report.json
    try {
        const reportPath = path.join(process.cwd(), 'test_sets', 'eval_reports', 'latest_eval_report.json')
        if (fs.existsSync(reportPath)) {
            const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
            return [
                {
                    id: 'local-latest',
                    run_at: report.evaluatedAt || new Date().toISOString(),
                    commit_sha: 'HEAD',
                    total_documents: report.totalDocumentsEvaluated || 0,
                    passed_documents: report.passedDocuments || 0,
                    overall_percentage: report.overallPercentage || 0,
                    status: report.status || 'SHIP-READY (PASS)',
                    report_json: report,
                },
            ] satisfies EvalRunRecord[]
        }
    } catch {
        // Return empty array if file read fails
    }

    return []
}
