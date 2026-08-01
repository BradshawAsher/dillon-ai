import { describe, expect, it } from 'vitest'

import { summarizeQuality } from './qualityMetrics'

describe('summarizeQuality', () => {
    it('returns empty, non-throwing rates for no documents', () => {
        expect(summarizeQuality([])).toEqual({
            total: 0,
            needsReviewCount: 0,
            needsReviewRate: 0,
            escalatedCount: 0,
            escalatedRate: 0,
            mathEvaluatedCount: 0,
            mathPassCount: 0,
            mathPassRate: null,
        })
    })

    it('counts human-review and escalation rates', () => {
        const summary = summarizeQuality([
            { needsHumanReview: true, aiEscalationReason: 'missing EBITDA' },
            { needsHumanReview: false, aiEscalationReason: '' },
            { needsHumanReview: false, aiEscalationReason: '   ' },
            { needsHumanReview: true, aiEscalationReason: 'ambiguous figure' },
        ])
        expect(summary.total).toBe(4)
        expect(summary.needsReviewCount).toBe(2)
        expect(summary.needsReviewRate).toBe(0.5)
        expect(summary.escalatedCount).toBe(2)
        expect(summary.escalatedRate).toBe(0.5)
    })

    it('excludes not_available math checks from the pass-rate denominator', () => {
        const summary = summarizeQuality([
            { mathCheckStatus: 'passed' },
            { mathCheckStatus: 'passed' },
            { mathCheckStatus: 'warning' },
            { mathCheckStatus: 'not_available' },
            { mathCheckStatus: '' },
        ])
        expect(summary.mathEvaluatedCount).toBe(3)
        expect(summary.mathPassCount).toBe(2)
        expect(summary.mathPassRate).toBeCloseTo(2 / 3)
    })

    it('reports a null math pass-rate when nothing was evaluated', () => {
        const summary = summarizeQuality([{ mathCheckStatus: 'not_available' }, {}])
        expect(summary.mathEvaluatedCount).toBe(0)
        expect(summary.mathPassRate).toBeNull()
    })
})
