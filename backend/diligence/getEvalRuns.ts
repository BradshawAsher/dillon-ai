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

export default async function getEvalRuns(req?: { params?: { full?: boolean | string; limit?: number | string } }) {
    const isFull = req?.params?.full === true || req?.params?.full === 'true'
    const limitNum = typeof req?.params?.limit === 'number'
        ? req?.params?.limit
        : typeof req?.params?.limit === 'string' && parseInt(req?.params?.limit, 10) > 0
            ? parseInt(req?.params?.limit, 10)
            : 15

    const summaryColumns = 'id, run_at, commit_sha, total_documents, passed_documents, overall_percentage, status'

    try {
        const { data: rows, error } = await supabase
            .from('eval_runs')
            .select(isFull ? '*' : summaryColumns)
            .order('run_at', { ascending: false })
            .limit(limitNum)

        if (!error && rows && rows.length > 0) {
            return rows.map((r: any) => ({
                id: r.id,
                run_at: r.run_at,
                commit_sha: r.commit_sha,
                total_documents: r.total_documents,
                passed_documents: r.passed_documents,
                overall_percentage: r.overall_percentage,
                status: r.status,
                report_json: r.report_json ?? null,
            })) as EvalRunRecord[]
        }
    } catch {
        // Fallback to local report file if database table is empty or unpopulated
    }

    // Fallback: Read from local latest_eval_report.json. Check the parent dir
    // too, so the report resolves when the process runs from a subdirectory
    // (e.g. the Vite dev server, whose cwd is frontend/).
    try {
        const relative = path.join('test_sets', 'eval_reports', 'latest_eval_report.json')
        const reportPath = [
            path.join(process.cwd(), relative),
            path.join(process.cwd(), '..', relative),
        ].find((candidate) => fs.existsSync(candidate))
        if (reportPath) {
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
