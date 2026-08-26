import { describe, expect, it } from 'vitest'

import type { SubmissionHistoryItem } from './submissionHistory'
import { HUMAN_MINUTES_PER_DOCUMENT, computeImpactMetrics, formatHours } from './impactMetrics'

function row(overrides: Partial<SubmissionHistoryItem>): SubmissionHistoryItem {
    return { status: 'completed', ...overrides } as SubmissionHistoryItem
}

describe('computeImpactMetrics', () => {
    it('returns an all-zero result for no rows', () => {
        const metrics = computeImpactMetrics([])
        expect(metrics).toEqual({
            completedDocuments: 0,
            agentMinutes: 0,
            analystHours: 0,
            timeSavedHours: 0,
            fasterMultiple: null,
            avgConfidence: null,
        })
    })

    it('ignores rows that are not completed', () => {
        const metrics = computeImpactMetrics([
            row({ status: 'processing' }),
            row({ status: 'queued' }),
        ])
        expect(metrics.completedDocuments).toBe(0)
    })

    it('measures agent runtime from the processing window', () => {
        const metrics = computeImpactMetrics([
            row({
                status: 'completed',
                processingStartedAt: '2024-01-01T00:00:00Z',
                processedAt: '2024-01-01T00:20:00Z',
            }),
        ])

        expect(metrics.completedDocuments).toBe(1)
        expect(metrics.agentMinutes).toBeCloseTo(20, 6)
        expect(metrics.analystHours).toBeCloseTo(HUMAN_MINUTES_PER_DOCUMENT / 60, 6)
        // 40 analyst minutes vs 20 agent minutes saves 20 minutes.
        expect(metrics.timeSavedHours).toBeCloseTo(20 / 60, 6)
        expect(metrics.fasterMultiple).toBeCloseTo(2, 6)
    })

    it('leaves fasterMultiple null when no usable timing exists', () => {
        const metrics = computeImpactMetrics([row({ status: 'completed' })])
        expect(metrics.completedDocuments).toBe(1)
        expect(metrics.agentMinutes).toBe(0)
        expect(metrics.fasterMultiple).toBeNull()
    })
})

describe('formatHours', () => {
    it('renders zero, negatives, and non-finite values as 0h', () => {
        expect(formatHours(0)).toBe('0h')
        expect(formatHours(-5)).toBe('0h')
        expect(formatHours(Number.NaN)).toBe('0h')
        expect(formatHours(Number.POSITIVE_INFINITY)).toBe('0h')
    })

    it('renders sub-hour values in minutes', () => {
        expect(formatHours(0.5)).toBe('30m')
    })

    it('promotes a sub-hour value that rounds to 60 minutes into hours', () => {
        expect(formatHours(0.999)).toBe('1.0h')
    })

    it('renders one decimal below ten hours and whole numbers above', () => {
        expect(formatHours(2.5)).toBe('2.5h')
        expect(formatHours(42)).toBe('42h')
    })
})
