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
}

export type DocScore = {
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
    const totalGtFacts = gt.financialFacts.length
    const usedActualIdx = new Set<number>()
    for (const gtFact of gt.financialFacts) {
        const gtYear = extractYear(gtFact.period)
        let matchIdx = actual.financialFacts.findIndex((f, i) =>
            !usedActualIdx.has(i)
            && f.metric.toLowerCase() === gtFact.metric.toLowerCase()
            && (gtYear === '' || extractYear(f.period) === gtYear))
        if (matchIdx === -1) {
            matchIdx = actual.financialFacts.findIndex((f, i) =>
                !usedActualIdx.has(i) && f.metric.toLowerCase() === gtFact.metric.toLowerCase())
        }
        if (matchIdx !== -1) {
            usedActualIdx.add(matchIdx)
            const match = actual.financialFacts[matchIdx]
            const diffPct = Math.abs(match.normalizedValue - gtFact.normalizedValue) / (gtFact.normalizedValue || 1)
            if (diffPct <= 0.01) factsPoints += 10
            else if (diffPct <= 0.05) factsPoints += 5
            else factsPoints += 3
        }
    }
    const factsScore = totalGtFacts > 0 ? (factsPoints / (totalGtFacts * 10)) * 10 : 10

    // 3. Risk Score (20 pts): traffic light (10) + expected-flag recall (10)
    let riskScore = gt.trafficLight.toUpperCase() === actual.trafficLight?.toUpperCase() ? 10 : 5
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
        employeeScore = actual.employeeEvidence?.count === gt.employeeEvidence.employee_count ? 5 : 0
    }

    // 6. Math Score (10 pts)
    const mathScore = gt.expectedMathCheckStatus.toLowerCase() === actual.mathCheckStatus?.toLowerCase() ? 10 : 5

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
