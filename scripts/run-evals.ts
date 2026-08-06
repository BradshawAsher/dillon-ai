import * as fs from 'fs'
import * as path from 'path'

import { evaluateDocument, summarizeResults, type ActualRunDoc, type DocScore, type EvalSummary } from './evalScoring'

type GroundTruthDoc = {
    fileName: string
    business: string
    fileType: string
    groundTruth: Parameters<typeof evaluateDocument>[0]
}

type ActualRunFile = {
    business: string
    projectId: string
    evaluatedAt: string
    documents: ActualRunDoc[]
}

type DocEvalResult = DocScore & {
    fileName: string
    business: string
}

export function runEvalSuite() {
    const rootDir = path.resolve(__dirname, '..')
    const groundTruthDir = path.join(rootDir, 'test_sets', 'ground_truth')
    const resultsDir = path.join(rootDir, 'test_sets', 'results')
    const outputDir = path.join(rootDir, 'test_sets', 'eval_reports')

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
    }

    const gtFiles = fs.readdirSync(groundTruthDir).filter((f) => f.endsWith('.json'))
    const resultFiles = fs.readdirSync(resultsDir).filter((f) => f.endsWith('.json'))

    console.log(`Found ${gtFiles.length} ground truth specifications and ${resultFiles.length} run results.`)

    const evalResults: DocEvalResult[] = []
    const matchedGtFiles = new Set<string>()

    for (const resultFile of resultFiles) {
        const runData: ActualRunFile = JSON.parse(fs.readFileSync(path.join(resultsDir, resultFile), 'utf8'))
        for (const rawDoc of runData.documents) {
            let actualDoc: ActualRunDoc = rawDoc
            if ((rawDoc as any).extractedJson) {
                try {
                    const parsed = typeof (rawDoc as any).extractedJson === 'string' ? JSON.parse((rawDoc as any).extractedJson) : (rawDoc as any).extractedJson
                    const redFlags = parsed.response?.flags?.red_flags || parsed.response?.flags?.redFlags || parsed.redFlags || []
                    const yellowFlags = parsed.response?.flags?.yellow_flags || parsed.response?.flags?.yellowFlags || parsed.yellowFlags || []
                    actualDoc = {
                        fileName: rawDoc.fileName,
                        fileType: rawDoc.fileType || 'XLSX',
                        status: rawDoc.status || 'completed',
                        detectedDocumentType: parsed.document_type || parsed.documentType || parsed.category || 'Other',
                        detectedDocumentTypes: parsed.document_types || parsed.documentTypes || [parsed.document_type || 'Other'],
                        trafficLight: parsed.traffic_light || parsed.trafficLight || 'GREEN',
                        riskLevel: parsed.risk_flag || parsed.riskLevel || 'LOW',
                        financialFacts: (parsed.financial_facts || parsed.financialFacts || []).map((f: any) => ({
                            metric: f.metric,
                            normalizedValue: Number(f.normalized_value ?? f.normalizedValue) || 0,
                            period: f.period,
                            confidence: f.confidence
                        })),
                        redFlags: Array.isArray(redFlags) ? redFlags : [],
                        yellowFlags: Array.isArray(yellowFlags) ? yellowFlags : [],
                        valuation: parsed.valuation || null,
                        employeeEvidence: parsed.employee_evidence || parsed.employeeEvidence || null,
                        mathCheckStatus: parsed.mathCheckStatus || 'passed'
                    }
                } catch (e) {
                    console.warn(`Failed to parse extractedJson for ${rawDoc.fileName}:`, e)
                }
            }

            const actualName = actualDoc.fileName.toLowerCase().replace(/[^a-z0-9]/g, '')
            const matchingGtFile = gtFiles.find((f) => {
                const gtData: GroundTruthDoc = JSON.parse(fs.readFileSync(path.join(groundTruthDir, f), 'utf8'))
                const gtName = gtData.fileName.toLowerCase().replace(/[^a-z0-9]/g, '')
                return gtName === actualName || gtName.includes(actualName) || actualName.includes(gtName)
            })

            if (!matchingGtFile) {
                console.warn(`No ground truth found for ${actualDoc.fileName}`)
                continue
            }

            matchedGtFiles.add(matchingGtFile)
            const gtData: GroundTruthDoc = JSON.parse(fs.readFileSync(path.join(groundTruthDir, matchingGtFile), 'utf8'))
            const score = evaluateDocument(gtData.groundTruth, actualDoc)

            evalResults.push({
                fileName: actualDoc.fileName,
                business: gtData.business,
                modelUsed: (rawDoc as any).modelUsed || 'Gemini 3.1 Flash Lite',
                ...score,
            })
        }
    }

    // Coverage: ground-truth specs that never got a scored result. Surfacing
    // these keeps the "20-input golden dataset" target honest.
    const uncoveredGtFiles = gtFiles.filter((f) => !matchedGtFiles.has(f))

    const summary = summarizeResults(evalResults, Number(process.env.EVAL_MIN_SCORE ?? 70))

    const summaryReport = {
        evaluatedAt: new Date().toISOString(),
        ...summary,
        groundTruthSpecs: gtFiles.length,
        uncoveredGroundTruth: uncoveredGtFiles,
        documentResults: evalResults,
    }

    const reportPath = path.join(outputDir, 'latest_eval_report.json')
    fs.writeFileSync(reportPath, JSON.stringify(summaryReport, null, 2))
    const markdownPath = path.join(outputDir, 'latest_eval_report.md')
    fs.writeFileSync(markdownPath, buildMarkdownReport(summaryReport))

    console.log('\n================ EVALUATION SUMMARY ================')
    console.log(`Overall Pass Rate: ${summary.passedDocuments}/${summary.totalDocumentsEvaluated} (${summary.overallPercentage}%)`)
    console.log(`Status: ${summary.status}`)
    console.log(`Regression gate: threshold ${summary.regressionThreshold}% -> ${summary.regressionPassed ? 'PASS' : 'FAIL'}`)
    console.log('--- Category averages (% of max) -------------------')
    for (const [dim, pct] of Object.entries(summary.categoryAverages)) {
        const marker = dim === summary.weakestDimension ? '  <-- weakest' : ''
        console.log(`  ${dim.padEnd(15)} ${pct}%${marker}`)
    }
    console.log('----------------------------------------------------')
    for (const res of evalResults) {
        console.log(`- ${res.fileName}: ${res.percentage}% (${res.pass ? 'PASS' : 'FAIL'})`)
    }
    if (uncoveredGtFiles.length > 0) {
        console.log(`\n${uncoveredGtFiles.length} ground-truth spec(s) have no run result yet:`)
        for (const f of uncoveredGtFiles) console.log(`  - ${f}`)
    }
    console.log('====================================================\n')
    console.log(`Reports saved to ${reportPath} and ${markdownPath}`)

    return summaryReport
}

function buildMarkdownReport(report: EvalSummary & {
    evaluatedAt: string
    groundTruthSpecs: number
    uncoveredGroundTruth: string[]
    documentResults: DocEvalResult[]
}): string {
    const lines: string[] = []
    lines.push('# Eval Regression Report', '')
    lines.push(`- **Generated:** ${report.evaluatedAt}`)
    lines.push(`- **Overall:** ${report.overallPercentage}% (${report.passedDocuments}/${report.totalDocumentsEvaluated} docs passing) — ${report.status}`)
    lines.push(`- **Regression gate:** threshold ${report.regressionThreshold}% → ${report.regressionPassed ? '✅ PASS' : '❌ FAIL'}`)
    lines.push(`- **Ground-truth coverage:** ${report.totalDocumentsEvaluated}/${report.groundTruthSpecs} specs scored`, '')
    lines.push('## Category averages (% of max)', '')
    lines.push('| Dimension | Avg |', '| --- | --- |')
    for (const [dim, pct] of Object.entries(report.categoryAverages)) {
        lines.push(`| ${dim}${dim === report.weakestDimension ? ' (weakest)' : ''} | ${pct}% |`)
    }
    lines.push('', '## Per-document scores', '')
    lines.push('| Document | Score | Verdict |', '| --- | --- | --- |')
    for (const res of report.documentResults) {
        lines.push(`| ${res.fileName} | ${res.percentage}% | ${res.pass ? 'PASS' : 'FAIL'} |`)
    }
    if (report.uncoveredGroundTruth.length > 0) {
        lines.push('', '## Ground-truth specs with no run result', '')
        for (const f of report.uncoveredGroundTruth) lines.push(`- ${f}`)
    }
    lines.push('')
    return lines.join('\n')
}

if (require.main === module) {
    const report = runEvalSuite()
    // Fail the process (and therefore the CI regression check) when the suite
    // drops below the configured threshold.
    if (!report.regressionPassed) {
        console.error(`\nEval regression gate FAILED: ${report.overallPercentage}% < ${report.regressionThreshold}% threshold.`)
        process.exit(1)
    }
}
