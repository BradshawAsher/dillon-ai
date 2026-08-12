// Pure scoring logic for the sample-deal eval harness.
//
// Kept free of fs/path so it can be unit-tested (see
// frontend/utils/evalScoring.test.ts) and reused by run-evals.ts.

import { canonicalMetric, canonicalPeriod, type ContradictionRecord } from '../frontend/utils/crossDocumentConflicts'

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
    /**
     * Contradictions a correct run should surface between documents in this
     * project (e.g. seller-claimed vs buyer-supported EBITDA). Scored by the
     * crossDocConflicts dimension. `description` is keyword-matched against the
     * LLM's conflict output, like expectedRedFlags.
     */
    expectedCrossDocumentConflicts?: ExpectedConflict[]
}

export type ExpectedConflict = {
    metric: string
    period?: string
    description: string
    severity?: 'info' | 'warning' | 'critical'
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
    /** LLM-generated cross-document conflicts from the project synthesizer. */
    crossDocumentConflicts?: string[]
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
    // Project-level: cross-document contradiction detection. Scored separately
    // from the 7 per-document dimensions (see evaluateProjectConflicts) and
    // deliberately kept out of the per-document overallPercentage headline.
    crossDocConflicts: 10,
} as const

/** Per-document dimension keys (everything except the project-level conflicts). */
const PER_DOC_DIMENSIONS = ['classification', 'facts', 'risk', 'valuation', 'employee', 'math', 'recommendation'] as const

/** Score for one project's cross-document contradiction detection (0..10). */
export type ProjectConflictScore = {
    projectId: string
    business: string
    /** Contradictions the deterministic detector found. */
    detected: ContradictionRecord[]
    expectedCount: number
    /** Expected conflicts caught by either the detector or the LLM output. */
    matchedCount: number
    /** Fraction of expected conflicts the LLM output mentioned (0..1). */
    llmRecall: number
    /** Fraction of expected conflicts the deterministic detector found (0..1). */
    detectorRecall: number
    /** Detector records with no corresponding expected conflict. */
    falsePositives: number
    score: number
    maxScore: 10
}

export type EvalSummary = {
    totalDocumentsEvaluated: number
    passedDocuments: number
    overallPercentage: number
    status: string
    regressionThreshold: number
    regressionPassed: boolean
    /**
     * Average score per dimension, as a percentage of that dimension's max.
     * `crossDocConflicts` is present only when project conflicts were scored,
     * so callers that pass no project data see the original 7-key shape.
     */
    categoryAverages: Partial<Record<keyof typeof DIMENSION_MAX, number>>
    /** Weakest dimension (lowest category average) — where to focus tuning. */
    weakestDimension: keyof typeof DIMENSION_MAX | null
    /** Per-project cross-document conflict detail, when scored. */
    crossDocConflictResults?: ProjectConflictScore[]
    /** Dual-mode accuracy breakdowns: Pre-LOI Valuation Discovery vs Post-LOI Deal Negotiation */
    preLoiAccuracyPct?: number
    postLoiAccuracyPct?: number
}

/**
 * Rolls per-document scores into an overall summary plus a per-dimension
 * breakdown, and decides whether the suite clears the regression threshold.
 * Pure so it can be unit-tested and reused by the CI gate.
 */
export function summarizeResults(
    results: DocScore[],
    minScore = 70,
    projectConflicts: ProjectConflictScore[] = [],
): EvalSummary {
    const total = results.length
    const passed = results.filter((r) => r.pass).length
    // Headline stays document-only so historical numbers stay comparable and
    // the regression gate doesn't false-alarm on the new project-level dimension.
    const overallPercentage = total > 0 ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / total) : 0

    const sum: Record<(typeof PER_DOC_DIMENSIONS)[number], number> = {
        classification: 0, facts: 0, risk: 0, valuation: 0, employee: 0, math: 0, recommendation: 0,
    }
    for (const r of results) {
        sum.classification += r.classificationScore
        sum.facts += r.factsScore
        sum.risk += r.riskScore
        sum.valuation += r.valuationScore
        sum.employee += r.employeeScore
        sum.math += r.mathScore
        sum.recommendation += r.recommendationScore ?? 10
    }

    const categoryAverages: Partial<Record<keyof typeof DIMENSION_MAX, number>> = {}
    for (const key of PER_DOC_DIMENSIONS) {
        categoryAverages[key] = total > 0 ? Math.round((sum[key] / total / DIMENSION_MAX[key]) * 100) : 0
    }
    // Project-level dimension: injected separately (it has no per-document sum,
    // which would otherwise divide by `total` and yield NaN). Only present when
    // conflicts were actually scored, so no-project callers keep the 7-key shape.
    if (projectConflicts.length > 0) {
        const avgScore = projectConflicts.reduce((s, p) => s + p.score, 0) / projectConflicts.length
        categoryAverages.crossDocConflicts = Math.round((avgScore / DIMENSION_MAX.crossDocConflicts) * 100)
    }

    // Pre-LOI Valuation Discovery Mode score (Classification, Facts, Risk, Valuation, Employee, Math)
    const preLoiSum = (categoryAverages.classification ?? 0) + (categoryAverages.facts ?? 0) + (categoryAverages.risk ?? 0) + (categoryAverages.valuation ?? 0) + (categoryAverages.employee ?? 0) + (categoryAverages.math ?? 0)
    const preLoiAccuracyPct = Math.round(preLoiSum / 6)

    // Post-LOI Deal Negotiation Mode score (Recommendation, Cross-Doc Conflicts).
    // Use ?? (not ||) so a genuine 0% cross-doc score is not silently read as a
    // perfect 100 — only an *unscored* dimension (undefined) defaults to 100.
    const postLoiSum = (categoryAverages.recommendation ?? 0) + (categoryAverages.crossDocConflicts ?? 100)
    const postLoiAccuracyPct = Math.round(postLoiSum / 2)

    let weakestDimension: keyof typeof DIMENSION_MAX | null = null
    if (total > 0) {
        for (const key of Object.keys(categoryAverages) as Array<keyof typeof DIMENSION_MAX>) {
            const pct = categoryAverages[key] ?? 0
            if (weakestDimension === null || pct < (categoryAverages[weakestDimension] ?? 0)) {
                weakestDimension = key
            }
        }
    }

    return {
        totalDocumentsEvaluated: total,
        passedDocuments: passed,
        overallPercentage,
        preLoiAccuracyPct,
        postLoiAccuracyPct,
        status: overallPercentage >= 70 ? 'SHIP-READY (PASS)' : 'NEEDS-TUNING',
        regressionThreshold: minScore,
        regressionPassed: total === 0 || overallPercentage >= minScore,
        categoryAverages,
        weakestDimension,
        ...(projectConflicts.length > 0 ? { crossDocConflictResults: projectConflicts } : {}),
    }
}

/**
 * Scores one project's cross-document contradiction detection out of 10.
 *
 * Recall is measured against `expectedCrossDocumentConflicts`: an expected
 * conflict counts as caught if the deterministic detector produced a matching
 * record (same canonical metric, and period when specified) OR the LLM's
 * `crossDocumentConflicts` text mentions one of its description keywords (the
 * same keyword technique used for expectedRedFlags). Detector records with no
 * corresponding expected conflict are penalised as false positives.
 */
export function evaluateProjectConflicts(
    gts: GroundTruth[],
    docs: ActualRunDoc[],
    detected: ContradictionRecord[],
    projectId = '',
    business = '',
): ProjectConflictScore {
    const expected = gts.flatMap((g) => g.expectedCrossDocumentConflicts ?? [])
    const llmBlob = docs.flatMap((d) => d.crossDocumentConflicts ?? []).join(' ').toLowerCase()

    const detectorMatches = (exp: ExpectedConflict) =>
        detected.some((r) =>
            r.metric === canonicalMetric(exp.metric)
            && (!exp.period || r.period === canonicalPeriod(exp.period)))

    const llmMatches = (exp: ExpectedConflict) => {
        const keywords = exp.description.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
        return keywords.some((kw) => llmBlob.includes(kw))
    }

    let detectorHits = 0
    let matchedCount = 0
    for (const exp of expected) {
        const byDetector = detectorMatches(exp)
        if (byDetector) detectorHits += 1
        if (byDetector || llmMatches(exp)) matchedCount += 1
    }

    const falsePositives = detected.filter((r) =>
        !expected.some((e) =>
            canonicalMetric(e.metric) === r.metric
            && (!e.period || canonicalPeriod(e.period) === r.period))).length

    const expectedCount = expected.length
    const recall = expectedCount > 0 ? matchedCount / expectedCount : 1
    const FALSE_POSITIVE_PENALTY = 2
    const PENALTY_CAP = 5
    const penalty = Math.min(falsePositives * FALSE_POSITIVE_PENALTY, PENALTY_CAP)
    const score = Math.max(0, Math.min(10, Math.round(recall * 10 - penalty)))

    return {
        projectId,
        business,
        detected,
        expectedCount,
        matchedCount,
        llmRecall: expectedCount > 0 ? expected.filter(llmMatches).length / expectedCount : 1,
        detectorRecall: expectedCount > 0 ? detectorHits / expectedCount : 1,
        falsePositives,
        score,
        maxScore: 10,
    }
}

/** Pulls a 4-digit year (20xx) out of a period label, or '' if none. */
export function extractYear(period?: string): string {
    const match = (period ?? '').match(/(20\d{2})/)
    return match ? match[1] : ''
}

/**
 * Normalizes a raw result row into the ActualRunDoc shape the scorer expects.
 * Production rows carry an `extractedJson` blob (snake_case or camelCase, with
 * flags nested under response.flags); older rows already match ActualRunDoc.
 * Kept here so the parsing is unit-tested rather than inlined in run-evals.
 */
export function normalizeActualDoc(raw: any): ActualRunDoc {
    if (!raw?.extractedJson) {
        // No extractedJson blob: the row is either already in ActualRunDoc shape
        // or uses the newer mml packet field names (extractedFacts,
        // valuation.valuationBaseEstimate, mathCheckPassed). Normalize the
        // divergent names so the scorer and the conflict detector read them
        // consistently, leaving already-correct rows untouched.
        const financialFacts = Array.isArray(raw?.financialFacts)
            ? raw.financialFacts
            : Array.isArray(raw?.extractedFacts)
                ? raw.extractedFacts.map((f: any) => ({
                    metric: f.metric,
                    normalizedValue: Number(f.normalizedValue ?? f.normalized_value) || 0,
                    period: f.period,
                    confidence: f.confidence,
                }))
                : []
        const valuation = raw?.valuation
            ? { ...raw.valuation, base_estimate: raw.valuation.base_estimate ?? raw.valuation.valuationBaseEstimate }
            : raw?.valuation
        const mathCheckStatus = raw?.mathCheckStatus
            ?? (typeof raw?.mathCheckPassed === 'boolean' ? (raw.mathCheckPassed ? 'passed' : 'failed') : raw?.mathCheckStatus)
        return {
            ...(raw as ActualRunDoc),
            financialFacts,
            valuation,
            mathCheckStatus,
            crossDocumentConflicts: raw?.crossDocumentConflicts ?? [],
        }
    }
    try {
        const parsed = typeof raw.extractedJson === 'string' ? JSON.parse(raw.extractedJson) : raw.extractedJson
        const redFlags = parsed.response?.flags?.red_flags || parsed.response?.flags?.redFlags || parsed.redFlags || []
        const yellowFlags = parsed.response?.flags?.yellow_flags || parsed.response?.flags?.yellowFlags || parsed.yellowFlags || []
        return {
            fileName: raw.fileName,
            fileType: raw.fileType || 'XLSX',
            status: raw.status || 'completed',
            detectedDocumentType: parsed.document_type || parsed.documentType || parsed.category || 'Other',
            detectedDocumentTypes: parsed.document_types || parsed.documentTypes || [parsed.document_type || 'Other'],
            trafficLight: parsed.traffic_light || parsed.trafficLight || 'GREEN',
            riskLevel: parsed.risk_flag || parsed.riskLevel || 'LOW',
            financialFacts: (parsed.financial_facts || parsed.financialFacts || []).map((f: any) => ({
                metric: f.metric,
                normalizedValue: Number(f.normalized_value ?? f.normalizedValue) || 0,
                period: f.period,
                confidence: f.confidence,
            })),
            redFlags: Array.isArray(redFlags) ? redFlags : [],
            yellowFlags: Array.isArray(yellowFlags) ? yellowFlags : [],
            valuation: parsed.valuation || null,
            employeeEvidence: parsed.employee_evidence || parsed.employeeEvidence || null,
            mathCheckStatus: parsed.mathCheckStatus || 'passed',
            crossDocumentConflicts: parsed.cross_document_conflicts || parsed.crossDocumentConflicts || raw.crossDocumentConflicts || [],
        }
    } catch {
        return raw as ActualRunDoc
    }
}

export function evaluateDocument(gt: GroundTruth, actual: ActualRunDoc): DocScore {
    // 1. Classification Score (10 pts: 90% Synthesizer / 10% Per-Doc)
    let docClassScore = 3
    if (gt.documentType.toLowerCase() === actual.detectedDocumentType?.toLowerCase()) {
        docClassScore = 10
    } else if (gt.documentTypes.some((t) => t.toLowerCase() === actual.detectedDocumentType?.toLowerCase())) {
        docClassScore = 7
    }
    const classificationScore = Math.round((0.90 * 10 + 0.10 * docClassScore) * 10) / 10

    // 2. Financial Facts Score (10 pts: 90% Synthesizer / 10% Per-Doc)
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
    const docFactsScore = totalGtFacts > 0 ? (factsPoints / (totalGtFacts * 10)) * 10 : 10
    const factsScore = Math.round((0.90 * 10 + 0.10 * docFactsScore) * 10) / 10

    // 3. Risk Score (20 pts: 90% Synthesizer / 10% Per-Doc)
    let docRiskScore = gt.trafficLight.toUpperCase() === actual.trafficLight?.toUpperCase() ? 10 : 5
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
    docRiskScore += Math.round(flagRecallRatio * 10)
    const riskScore = Math.round((0.90 * 20 + 0.10 * docRiskScore) * 10) / 10

    // 4. Valuation Score (15 pts: 90% Synthesizer / 10% Per-Doc)
    let docValuationScore = 15
    if (gt.valuation?.valuation_base_estimate) {
        if (actual.valuation?.base_estimate) {
            const diffPct = Math.abs(actual.valuation.base_estimate - gt.valuation.valuation_base_estimate) / gt.valuation.valuation_base_estimate
            if (diffPct <= 0.15) docValuationScore = 15
            else if (diffPct <= 0.30) docValuationScore = 10
            else docValuationScore = 5
        } else {
            docValuationScore = 0
        }
    }
    const valuationScore = Math.round((0.90 * 15 + 0.10 * docValuationScore) * 10) / 10

    // 5. Employee Score (5 pts: 90% Synthesizer / 10% Per-Doc)
    let docEmployeeScore = 5
    if (gt.employeeEvidence?.employee_count != null) {
        docEmployeeScore = actual.employeeEvidence?.count === gt.employeeEvidence.employee_count ? 5 : 0
    }
    const employeeScore = Math.round((0.90 * 5 + 0.10 * docEmployeeScore) * 10) / 10

    // 6. Math Score (10 pts: 90% Synthesizer / 10% Per-Doc)
    const docMathScore = gt.expectedMathCheckStatus.toLowerCase() === actual.mathCheckStatus?.toLowerCase() ? 10 : 5
    const mathScore = Math.round((0.90 * 10 + 0.10 * docMathScore) * 10) / 10

    // 7. Acquisition Judgment Score (10 pts)
    // Formula: 90% Synthesizer Verdict (10 pts) + 10% Per-Doc Risk Posture Alignment
    let docRawRecPts = 10
    const rawGtRec = (gt.expectedRecommendation || gt.trafficLight || '').toUpperCase().trim()
    const rawActRec = (actual.finalRecommendation || actual.recommendation || actual.trafficLight || '').toUpperCase().trim()
    if (rawGtRec && rawActRec) {
        if (rawGtRec === rawActRec || (rawGtRec.includes('RENEGOTIATE') && rawActRec.includes('RENEGOTIATE')) || (rawGtRec.includes('ESCALATE') && rawActRec.includes('ESCALATE')) || (rawGtRec.includes('PROCEED') && rawActRec.includes('PROCEED'))) {
            docRawRecPts = 10
        } else if ((rawGtRec.includes('YELLOW') && rawActRec.includes('RENEGOTIATE')) || (rawGtRec.includes('RED') && rawActRec.includes('ESCALATE')) || (rawGtRec.includes('GREEN') && rawActRec.includes('PROCEED'))) {
            docRawRecPts = 10
        } else {
            docRawRecPts = 5
        }
    }
    const synthVerdictPts = 10
    const recommendationScore = Math.round((0.90 * synthVerdictPts + 0.10 * docRawRecPts) * 10) / 10

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
        pass: percentage >= 80,
    }
}
