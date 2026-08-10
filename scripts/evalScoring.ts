// Pure scoring logic for the sample-deal eval harness.
//
// Kept free of fs/path so it can be unit-tested (see
// frontend/utils/evalScoring.test.ts) and reused by run-evals.ts.

export type FinancialFact = {
    metric: string
    normalizedValue: number
    period?: string
    rawValue?: string
}

export type GroundTruth = {
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
    expectedRecommendation?: string
}

export type ActualRunDoc = {
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
    finalRecommendation?: string
    recommendation?: string
}

export type DocScore = {
    classificationScore: number // max 10
    factsScore: number // max 10
    riskScore: number // max 20
    valuationScore: number // max 15
    employeeScore: number // max 5
    mathScore: number // max 10
    recommendationScore: number // max 10
    totalScore: number
    maxScore: number
    percentage: number
    pass: boolean
}

/** Per-dimension max points, used to express category averages as percentages. */
export const DIMENSION_MAX = {
    classification: 10,
    facts: 10,
    risk: 20,
    valuation: 15,
    employee: 5,
    math: 10,
    recommendation: 10,
} as const

export type EvalSummary = {
    totalDocumentsEvaluated: number
    passedDocuments: number
    overallPercentage: number
    status: string
    regressionThreshold: number
    regressionPassed: boolean
    /** Average score per dimension, as a percentage of that dimension's max. */
    categoryAverages: Record<keyof typeof DIMENSION_MAX, number>
    /** Weakest dimension (lowest category average) — where to focus tuning. */
    weakestDimension: keyof typeof DIMENSION_MAX | null
}

/**
 * Rolls per-document scores into an overall summary plus a per-dimension
 * breakdown, and decides whether the suite clears the regression threshold.
 * Pure so it can be unit-tested and reused by the CI gate.
 */
export function summarizeResults(results: DocScore[], minScore = 70): EvalSummary {
    const total = results.length
    const passed = results.filter((r) => r.pass).length
    const overallPercentage = total > 0 ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / total) : 0

    const sum = { classification: 0, facts: 0, risk: 0, valuation: 0, employee: 0, math: 0, recommendation: 0 }
    for (const r of results) {
        sum.classification += r.classificationScore
        sum.facts += r.factsScore
        sum.risk += r.riskScore
        sum.valuation += r.valuationScore
        sum.employee += r.employeeScore
        sum.math += r.mathScore
        sum.recommendation += r.recommendationScore ?? 10
    }

    const categoryAverages = {} as Record<keyof typeof DIMENSION_MAX, number>
    let weakestDimension: keyof typeof DIMENSION_MAX | null = null
    for (const key of Object.keys(DIMENSION_MAX) as Array<keyof typeof DIMENSION_MAX>) {
        const pct = total > 0 ? Math.round((sum[key] / total / DIMENSION_MAX[key]) * 100) : 0
        categoryAverages[key] = pct
        if (total > 0 && (weakestDimension === null || pct < categoryAverages[weakestDimension])) {
            weakestDimension = key
        }
    }

    return {
        totalDocumentsEvaluated: total,
        passedDocuments: passed,
        overallPercentage,
        status: overallPercentage >= 70 ? 'SHIP-READY (PASS)' : 'NEEDS-TUNING',
        regressionThreshold: minScore,
        regressionPassed: total === 0 || overallPercentage >= minScore,
        categoryAverages,
        weakestDimension,
    }
}

/** Pulls a 4-digit year (20xx) out of a period label, or '' if none. */
export function extractYear(period?: string): string {
    const match = (period ?? '').match(/(20\d{2})/)
    return match ? match[1] : ''
}

export function evaluateDocument(gt: GroundTruth, actual: ActualRunDoc): DocScore {
    // 1. Classification Score (10 pts)
    let classificationScore = 3
    if (gt.documentType.toLowerCase() === actual.detectedDocumentType?.toLowerCase()) {
        classificationScore = 10
    } else if (gt.documentTypes.some((t) => t.toLowerCase() === actual.detectedDocumentType?.toLowerCase())) {
        classificationScore = 7
    }

    // 2. Financial Facts Score (10 pts per metric, averaged).
    // Match on metric AND reporting year, consuming each actual fact at most
    // once, so period-differentiated facts (e.g. FY2024 vs LTM 2025 revenue)
    // are compared against the right value instead of always the first match.
    let factsPoints = 0
    const totalGtFacts = Array.isArray(gt.financialFacts) ? gt.financialFacts.length : 0
    const actualFacts = Array.isArray(actual.financialFacts) ? actual.financialFacts : []
    const usedActualIdx = new Set<number>()

    if (totalGtFacts > 0) {
        for (const gtFact of gt.financialFacts) {
            const gtYear = extractYear(gtFact.period)
            let matchIdx = actualFacts.findIndex((f, i) =>
                !usedActualIdx.has(i)
                && f.metric.toLowerCase() === gtFact.metric.toLowerCase()
                && (gtYear === '' || extractYear(f.period) === gtYear))
            if (matchIdx === -1) {
                matchIdx = actualFacts.findIndex((f, i) =>
                    !usedActualIdx.has(i) && f.metric.toLowerCase() === gtFact.metric.toLowerCase())
            }
            if (matchIdx !== -1) {
                usedActualIdx.add(matchIdx)
                const match = actualFacts[matchIdx]
                const diffPct = Math.abs(match.normalizedValue - gtFact.normalizedValue) / (gtFact.normalizedValue || 1)
                if (diffPct <= 0.01) factsPoints += 10
                else if (diffPct <= 0.05) factsPoints += 5
                else factsPoints += 3
            }
        }
    }
    const factsScore = totalGtFacts > 0 ? (factsPoints / (totalGtFacts * 10)) * 10 : 10

    // 3. Risk Score (20 pts): traffic light (10) + expected-flag recall (10)
    let riskScore = gt.trafficLight.toUpperCase() === actual.trafficLight?.toUpperCase() ? 10 : 5
    const actualRed = Array.isArray(actual.redFlags) ? actual.redFlags : []
    const actualYellow = Array.isArray(actual.yellowFlags) ? actual.yellowFlags : []
    const combinedActualFlags = [...actualRed, ...actualYellow].join(' ').toLowerCase()
    const gtRed = Array.isArray(gt.expectedRedFlags) ? gt.expectedRedFlags : []
    const gtYellow = Array.isArray(gt.expectedYellowFlags) ? gt.expectedYellowFlags : []
    const totalExpectedFlags = [...gtRed, ...gtYellow]
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
        employeeScore = actual.employeeEvidence?.count === gt.employeeEvidence.employee_count ? 5 : 0
    }

    // 6. Math Score (10 pts)
    const mathScore = gt.expectedMathCheckStatus.toLowerCase() === actual.mathCheckStatus?.toLowerCase() ? 10 : 5

    // 7. Recommendation Score (10 pts)
    let recommendationScore = 10
    const rawGtRec = (gt.expectedRecommendation || gt.trafficLight || '').toUpperCase().trim()
    const rawActRec = (actual.finalRecommendation || actual.recommendation || actual.trafficLight || '').toUpperCase().trim()
    if (rawGtRec && rawActRec) {
        if (rawGtRec === rawActRec || (rawGtRec.includes('RENEGOTIATE') && rawActRec.includes('RENEGOTIATE')) || (rawGtRec.includes('ESCALATE') && rawActRec.includes('ESCALATE')) || (rawGtRec.includes('PROCEED') && rawActRec.includes('PROCEED'))) {
            recommendationScore = 10
        } else if ((rawGtRec.includes('YELLOW') && rawActRec.includes('RENEGOTIATE')) || (rawGtRec.includes('RED') && rawActRec.includes('ESCALATE')) || (rawGtRec.includes('GREEN') && rawActRec.includes('PROCEED'))) {
            recommendationScore = 10
        } else {
            recommendationScore = 5
        }
    }

    const totalScore = classificationScore + factsScore + riskScore + valuationScore + employeeScore + mathScore + recommendationScore
    const maxScore = 10 + 10 + 20 + 15 + 5 + 10 + 10
    const percentage = Math.round((totalScore / maxScore) * 100)

    return {
        classificationScore,
        factsScore: Math.round(factsScore * 10) / 10,
        riskScore,
        valuationScore,
        employeeScore,
        mathScore,
        recommendationScore,
        totalScore,
        maxScore,
        percentage,
        pass: percentage >= 70,
    }
}
