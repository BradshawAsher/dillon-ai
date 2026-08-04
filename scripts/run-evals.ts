import * as fs from 'fs'
import * as path from 'path'

import { evaluateDocument, type ActualRunDoc, type DocScore } from './evalScoring'

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

    for (const resultFile of resultFiles) {
        const runData: ActualRunFile = JSON.parse(fs.readFileSync(path.join(resultsDir, resultFile), 'utf8'))
        for (const actualDoc of runData.documents) {
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

            const gtData: GroundTruthDoc = JSON.parse(fs.readFileSync(path.join(groundTruthDir, matchingGtFile), 'utf8'))
            const score = evaluateDocument(gtData.groundTruth, actualDoc)

            evalResults.push({
                fileName: actualDoc.fileName,
                business: gtData.business,
                ...score,
            })
        }
    }

    const totalDocCount = evalResults.length
    const passedCount = evalResults.filter((r) => r.pass).length
    const overallPercentage = totalDocCount > 0 ? Math.round(evalResults.reduce((sum, r) => sum + r.percentage, 0) / totalDocCount) : 0

    const summaryReport = {
        evaluatedAt: new Date().toISOString(),
        totalDocumentsEvaluated: totalDocCount,
        passedDocuments: passedCount,
        overallPercentage,
        status: overallPercentage >= 80 ? 'SHIP-READY (PASS)' : 'NEEDS-TUNING',
        documentResults: evalResults,
    }

    const reportPath = path.join(outputDir, 'latest_eval_report.json')
    fs.writeFileSync(reportPath, JSON.stringify(summaryReport, null, 2))

    console.log('\n================ EVALUATION SUMMARY ================')
    console.log(`Overall Pass Rate: ${passedCount}/${totalDocCount} (${overallPercentage}%)`)
    console.log(`Status: ${summaryReport.status}`)
    console.log('----------------------------------------------------')
    for (const res of evalResults) {
        console.log(`- ${res.fileName}: ${res.percentage}% (${res.pass ? 'PASS' : 'FAIL'})`)
    }
    console.log('====================================================\n')
    console.log(`Report saved to ${reportPath}`)

    return summaryReport
}

if (require.main === module) {
    runEvalSuite()
}
