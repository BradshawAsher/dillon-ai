// Pure quality / reliability rates over document submission history.
//
// Answers two questions the pipeline could not previously report:
//  - what share of extractions auto-escalate to human review, and
//  - what share of documents pass the deterministic arithmetic reconciliation.
// Both are derived from fields the n8n workflow already writes on each row.

export type QualityInput = {
    needsHumanReview?: boolean
    mathCheckStatus?: string
    aiEscalationReason?: string
}

export type QualitySummary = {
    total: number
    needsReviewCount: number
    needsReviewRate: number
    escalatedCount: number
    escalatedRate: number
    /** Documents where reconciliation actually ran (2+ related figures extracted). */
    mathEvaluatedCount: number
    mathPassCount: number
    /** Pass rate among evaluated documents; null when none were evaluated. */
    mathPassRate: number | null
}

function isMathEvaluated(status: string | undefined): boolean {
    const normalized = (status ?? '').trim().toLowerCase()
    return normalized.length > 0
        && normalized !== 'not_available'
        && normalized !== 'n/a'
        && normalized !== 'unknown'
}

function isMathPass(status: string | undefined): boolean {
    const normalized = (status ?? '').trim().toLowerCase()
    return normalized === 'passed' || normalized === 'pass'
}

export function summarizeQuality(items: QualityInput[]): QualitySummary {
    const total = items.length
    let needsReviewCount = 0
    let escalatedCount = 0
    let mathEvaluatedCount = 0
    let mathPassCount = 0

    for (const item of items) {
        if (item.needsHumanReview) {
            needsReviewCount += 1
        }
        if ((item.aiEscalationReason ?? '').trim().length > 0) {
            escalatedCount += 1
        }
        if (isMathEvaluated(item.mathCheckStatus)) {
            mathEvaluatedCount += 1
            if (isMathPass(item.mathCheckStatus)) {
                mathPassCount += 1
            }
        }
    }

    return {
        total,
        needsReviewCount,
        needsReviewRate: total === 0 ? 0 : needsReviewCount / total,
        escalatedCount,
        escalatedRate: total === 0 ? 0 : escalatedCount / total,
        mathEvaluatedCount,
        mathPassCount,
        mathPassRate: mathEvaluatedCount === 0 ? null : mathPassCount / mathEvaluatedCount,
    }
}
