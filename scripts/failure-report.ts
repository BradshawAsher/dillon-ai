// Generates a human-readable failure-case report from the latest eval run.
//
// The eval harness scores every document; this distills the FAILURES into a
// report an analyst can act on: which documents fell below the pass bar, which
// scoring dimension dragged them down, and the likely cause — so tuning effort
// goes where it moves the number. Run with: npx tsx scripts/failure-report.ts
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import { DIMENSION_MAX } from './evalScoring'

type DocResult = {
    fileName: string
    business: string
    classificationScore: number
    factsScore: number
    riskScore: number
    valuationScore: number
    employeeScore: number
    mathScore: number
    percentage: number
    pass: boolean
}

type Report = {
    evaluatedAt: string
    overallPercentage: number
    passedDocuments: number
    totalDocumentsEvaluated: number
    documentResults: DocResult[]
}

const DIMENSION_FIELDS: Array<{ key: keyof typeof DIMENSION_MAX; field: keyof DocResult; label: string }> = [
    { key: 'classification', field: 'classificationScore', label: 'Document classification' },
    { key: 'facts', field: 'factsScore', label: 'Financial-fact extraction' },
    { key: 'risk', field: 'riskScore', label: 'Risk / flag detection' },
    { key: 'valuation', field: 'valuationScore', label: 'Valuation accuracy' },
    { key: 'employee', field: 'employeeScore', label: 'Employee evidence' },
    { key: 'math', field: 'mathScore', label: 'Math checks' },
]

/** Ranks a document's dimensions by how far below max they scored. */
function weakestDimensions(doc: DocResult) {
    return DIMENSION_FIELDS
        .map((d) => {
            const max = DIMENSION_MAX[d.key]
            const got = Number(doc[d.field]) || 0
            return { label: d.label, got, max, pct: Math.round((got / max) * 100) }
        })
        .filter((d) => d.pct < 100)
        .sort((a, b) => a.pct - b.pct)
}

export function buildFailureReport(report: Report): string {
    const failures = report.documentResults.filter((d) => !d.pass)
    const lines: string[] = []

    lines.push('# Eval Failure-Case Report', '')
    lines.push(`- **Generated:** ${report.evaluatedAt}`)
    lines.push(`- **Overall:** ${report.overallPercentage}% (${report.passedDocuments}/${report.totalDocumentsEvaluated} passing)`)
    lines.push(`- **Failing cases:** ${failures.length}`, '')

    if (failures.length === 0) {
        lines.push('No failing cases — every scored document cleared the pass bar. 🎉', '')
        return lines.join('\n')
    }

    // Aggregate: which dimension causes the most failures?
    const dimFailCounts = new Map<string, number>()
    for (const doc of failures) {
        const weakest = weakestDimensions(doc)[0]
        if (weakest) dimFailCounts.set(weakest.label, (dimFailCounts.get(weakest.label) ?? 0) + 1)
    }
    const topDriver = [...dimFailCounts.entries()].sort((a, b) => b[1] - a[1])[0]
    if (topDriver) {
        lines.push(`**Most common failure driver:** ${topDriver[0]} (weakest dimension in ${topDriver[1]} of ${failures.length} failing docs).`, '')
    }

    lines.push('## Failing documents', '')
    for (const doc of failures) {
        const weak = weakestDimensions(doc).slice(0, 2)
        lines.push(`### ${doc.fileName} — ${doc.percentage}%`)
        lines.push(`- Business: ${doc.business}`)
        if (weak.length > 0) {
            lines.push(`- Weakest: ${weak.map((w) => `${w.label} (${w.pct}%)`).join(', ')}`)
        }
        lines.push('')
    }

    return lines.join('\n')
}

function main() {
    const rootDir = path.resolve(__dirname, '..')
    const reportPath = path.join(rootDir, 'test_sets', 'eval_reports', 'latest_eval_report.json')
    if (!fs.existsSync(reportPath)) {
        console.error(`No eval report found at ${reportPath}. Run "npm run eval" first.`)
        process.exit(1)
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as Report
    const markdown = buildFailureReport(report)
    const outPath = path.join(rootDir, 'test_sets', 'eval_reports', 'failure_case_report.md')
    fs.writeFileSync(outPath, markdown)
    console.log(markdown)
    console.log(`\nFailure-case report written to ${outPath}`)
}

main()
