import { describe, it, expect } from 'vitest'
import {
    isDocumentCostEstimated,
    formatDocumentCostDisplay,
    calculateBatchTotalCost,
} from './diligenceDashboardUtils'
import type { SubmissionHistoryItem } from './submissionHistory'

const doc = (partial: Partial<SubmissionHistoryItem>) => partial as Partial<SubmissionHistoryItem>

describe('isDocumentCostEstimated', () => {
    it('treats a missing document as estimated', () => {
        expect(isDocumentCostEstimated(null)).toBe(true)
        expect(isDocumentCostEstimated(undefined)).toBe(true)
    })

    it('treats a positive measured costUsd as not estimated', () => {
        expect(isDocumentCostEstimated(doc({ costUsd: 0.05 }))).toBe(false)
    })

    it('treats a zero or missing costUsd as estimated', () => {
        expect(isDocumentCostEstimated(doc({ costUsd: 0 }))).toBe(true)
        expect(isDocumentCostEstimated(doc({}))).toBe(true)
    })
})

describe('formatDocumentCostDisplay', () => {
    it('formats a measured cost without the estimate prefix', () => {
        const result = formatDocumentCostDisplay(doc({ costUsd: 0.05 }))
        expect(result.isEstimate).toBe(false)
        expect(result.rawCost).toBe(0.05)
        expect(result.formatted).toBe('$0.0500')
    })

    it('prefixes estimated costs with "Est."', () => {
        const result = formatDocumentCostDisplay(doc({}))
        expect(result.isEstimate).toBe(true)
        expect(result.formatted.startsWith('Est. $')).toBe(true)
        expect(result.rawCost).toBeGreaterThan(0)
    })
})

describe('calculateBatchTotalCost', () => {
    it('returns a sensible default for an empty batch', () => {
        expect(calculateBatchTotalCost([])).toBe(0.0072)
    })

    it('sums measured per-document costs', () => {
        const total = calculateBatchTotalCost([doc({ costUsd: 0.02 }), doc({ costUsd: 0.03 })])
        expect(total).toBeCloseTo(0.05, 10)
    })
})
