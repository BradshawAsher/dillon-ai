import * as fs from 'fs'
import * as path from 'path'

type FinancialFact = {
    metric: string
    normalizedValue: number
    period?: string
    rawValue?: string
}

type GroundTruthDoc = {
    fileName: string
    business: string
    fileType: string
    groundTruth: {
        documentType: string
        documentTypes: string[]
        trafficLight: string
        riskLevel: string
        financialFacts: FinancialFact[]
        expectedRedFlags: string[]
        expectedYellowFlags: string[]
        falsePositiveFlags: string[]
        valuation?: {
            valuation_base_estimate?: number
        } | null
        employeeEvidence?: {
            employee_count?: number | null
        } | null
        expectedMathCheckStatus: string
    }
}

type ActualRunDoc = {
    fileName: string
    fileType: string
    status: string
    detectedDocumentType: string
    detectedDocumentTypes: string[]
    trafficLight: string
    riskLevel: string
    financialFacts: Array<{
        metric: string
        normalizedValue: number
        period?: string
        confidence?: number
    }>
    redFlags: string[]
    yellowFlags: string[]
    valuation?: {
        base_estimate?: number
    } | null
    employeeEvidence?: {
        count?: number | null
    } | null
    mathCheckStatus: string
}

type ActualRunFile = {
    business: string
    projectId: string
    evaluatedAt: string
    documents: ActualRunDoc[]
}

type DocEvalResult = {
    fileName: string
    business: string
    classificationScore: number // max 10
    factsScore: number // max 10
    riskScore: number // max 20
    valuationScore: number // max 15
    employeeScore: number // max 5
    mathScore: number // max 10
    totalScore: number
    maxScore: number
    percentage: number
    pass: boolean
}

function evaluateDocument(gt: GroundTruthDoc['groundTruth'], actual: ActualRunDoc): Omit<DocEvalResult, 'fileName' | 'business'> {
    // 1. Classification Score (10 pts)
    let classificationScore = 0
    if (gt.documentType.toLowerCase() === actual.detectedDocumentType?.toLowerCase()) {
        classificationScore = 10
    } else if (gt.documentTypes.some((t) => t.toLowerCase() === actual.detectedDocumentType?.toLowerCase())) {
        classificationScore = 7
    } else {
        classificationScore = 3
    }

    // 2. Financial Facts Score (10 pts per metric, averaged)
    let factsPoints = 0
    const totalGtFacts = gt.financialFacts.length
    if (totalGtFacts > 0) {
        for (const gtFact of gt.financialFacts) {
            const match = actual.financialFacts.find((f) => f.metric.toLowerCase() === gtFact.metric.toLowerCase())
            if (match) {
                const diffPct = Math.abs(match.normalizedValue - gtFact.normalizedValue) / (gtFact.normalizedValue || 1)
                if (diffPct <= 0.01) {
                    factsPoints += 10
                } else if (diffPct <= 0.05) {
                    factsPoints += 5
                } else {
                    factsPoints += 3
                }
            }
        }
    }
    const factsScore = totalGtFacts > 0 ? (factsPoints / (totalGtFacts * 10)) * 10 : 10

    // 3. Risk Score (20 pts)
    let riskScore = 0
    // Traffic light (10 pts)
    if (gt.trafficLight.toUpperCase() === actual.trafficLight?.toUpperCase()) {
        riskScore += 10
    } else {
        riskScore += 5 // adjacent traffic light
    }
    // Flag recall (10 pts)
    const combinedActualFlags = [...(actual.redFlags || []), ...(actual.yellowFlags || [])].join(' ').toLowerCase()
    const totalExpectedFlags = [...gt.expectedRedFlags, ...gt.expectedYellowFlags]
    let flagsCaught = 0
    for (const expFlag of totalExpectedFlags) {
        const keywords = expFlag.toLowerCase().split(' ').filter((w) => w.length > 3)
        if (keywords.some((kw) => combinedActualFlags.includes(kw))) {
            flagsCaught++
        }
    }
    const flagRecallRatio = totalExpectedFlags.length > 0 ? flagsCaught / totalExpectedFlags.length : 1
    riskScore += Math.round(flagRecallRatio * 10)

    // 4. Valuation Score (15 pts)
    let valuationScore = 15
    if (gt.valuation?.valuation_base_estimate) {
        if (actual.valuation?.base_estimate) {
            const diffPct = Math.abs(actual.valuation.base_estimate - gt.valuation.valuation_base_estimate) / gt.valuation.valuation_base_estimate
            if (diffPct <= 0.15) valuationScore = 15
            else if (diffPct <= 0.30) valuationScore = 10
            else valuationScore = 5
        } else {
            valuationScore = 0
        }
    }

    // 5. Employee Score (5 pts)
    let employeeScore = 5
    if (gt.employeeEvidence?.employee_count != null) {
        if (actual.employeeEvidence?.count === gt.employeeEvidence.employee_count) {
            employeeScore = 5
        } else {
            employeeScore = 0
        }
    }

    // 6. Math Score (10 pts)
    let mathScore = 0
    if (gt.expectedMathCheckStatus.toLowerCase() === actual.mathCheckStatus?.toLowerCase()) {
        mathScore = 10
    } else {
        mathScore = 5
    }

    const totalScore = classificationScore + factsScore + riskScore + valuationScore + employeeScore + mathScore
    const maxScore = 10 + 10 + 20 + 15 + 5 + 10
    const percentage = Math.round((totalScore / maxScore) * 100)

    return {
        classificationScore,
        factsScore: Math.round(factsScore * 10) / 10,
        riskScore,
        valuationScore,
        employeeScore,
        mathScore,
        totalScore,
        maxScore,
        percentage,
        pass: percentage >= 80,
    }
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
            const matchingGtFile = gtFiles.find((f) => {
                const gtData: GroundTruthDoc = JSON.parse(fs.readFileSync(path.join(groundTruthDir, f), 'utf8'))
                return gtData.fileName.toLowerCase() === actualDoc.fileName.toLowerCase()
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
