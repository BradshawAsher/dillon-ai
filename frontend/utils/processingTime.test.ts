import { describe, expect, it } from 'vitest'

import {
    estimateProcessingSeconds,
    formatDuration,
    SECONDS_PER_DOCUMENT_BASE,
    SECONDS_PER_SYNTHESIS,
} from './processingTime'

describe('estimateProcessingSeconds', () => {
    it('uses the base rate when no character count is given', () => {
        const estimate = estimateProcessingSeconds({ documentCount: 3 })
        expect(estimate.documentSeconds).toBe(3 * SECONDS_PER_DOCUMENT_BASE)
        expect(estimate.synthesisSeconds).toBe(0)
        expect(estimate.totalSeconds).toBe(3 * SECONDS_PER_DOCUMENT_BASE)
    })

    it('adds a synthesis term only when requested and there is at least one document', () => {
        expect(estimateProcessingSeconds({ documentCount: 2, includeSynthesis: true }).synthesisSeconds).toBe(SECONDS_PER_SYNTHESIS)
        expect(estimateProcessingSeconds({ documentCount: 0, includeSynthesis: true }).synthesisSeconds).toBe(0)
    })

    it('refines the per-document term with parsed character count', () => {
        const withChars = estimateProcessingSeconds({ documentCount: 1, totalCharacters: 10_000 })
        // 45s base + (10 * 3s) = 75s
        expect(withChars.documentSeconds).toBe(SECONDS_PER_DOCUMENT_BASE + 30)
    })

    it('never returns negative time for degenerate input', () => {
        const estimate = estimateProcessingSeconds({ documentCount: -5 })
        expect(estimate.totalSeconds).toBe(0)
    })

    it('coerces non-finite inputs to a finite estimate', () => {
        expect(estimateProcessingSeconds({ documentCount: Number.NaN }).totalSeconds).toBe(0)
        const infChars = estimateProcessingSeconds({ documentCount: 2, totalCharacters: Number.POSITIVE_INFINITY })
        expect(infChars.totalSeconds).toBe(2 * SECONDS_PER_DOCUMENT_BASE)
        expect(Number.isFinite(infChars.totalSeconds)).toBe(true)
    })
})

describe('formatDuration', () => {
    it('renders seconds under 90s', () => {
        expect(formatDuration(45)).toBe('~45 sec')
    })

    it('renders minutes', () => {
        expect(formatDuration(150)).toBe('~3 min')
    })

    it('renders hours with remaining minutes', () => {
        expect(formatDuration(3 * 3600 + 20 * 60)).toBe('~3 hr 20 min')
    })

    it('renders days with remaining hours for very long estimates', () => {
        expect(formatDuration(26 * 3600)).toBe('~1 day 2 hr')
        expect(formatDuration(48 * 3600)).toBe('~2 days')
    })

    it('renders a dash for non-positive or invalid input', () => {
        expect(formatDuration(0)).toBe('—')
        expect(formatDuration(Number.NaN)).toBe('—')
    })

    it('carries rounding up instead of showing impossible remainders', () => {
        // 1 hr 59.7 min: rounding minutes independently used to yield "~1 hr 60 min".
        expect(formatDuration(1 * 3600 + 59.7 * 60)).toBe('~2 hr')
        // 23 hr 59.7 min: used to yield "~23 hr 60 min"; should roll into a day.
        expect(formatDuration(23 * 3600 + 59.7 * 60)).toBe('~1 day')
        // 47.8 hr: used to yield "1 day 24 hr".
        expect(formatDuration(47.8 * 3600)).toBe('~1 day 23 hr')
        // 59.7 min: used to yield "~60 min"; should promote to an hour.
        expect(formatDuration(59.7 * 60)).toBe('~1 hr')
    })
})
