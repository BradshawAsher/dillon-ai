import { describe, expect, it } from 'vitest'

import { formatCompactUsd } from './formatCompactUsd'

describe('formatCompactUsd', () => {
    it('formats millions with one decimal', () => {
        expect(formatCompactUsd(2_500_000)).toBe('$2.5M')
        expect(formatCompactUsd(1_000_000)).toBe('$1.0M')
    })

    it('formats thousands as whole K', () => {
        expect(formatCompactUsd(340_000)).toBe('$340K')
        expect(formatCompactUsd(1_500)).toBe('$2K') // rounds to nearest whole K
    })

    it('formats sub-thousand values with comma grouping', () => {
        expect(formatCompactUsd(500)).toBe('$500')
        expect(formatCompactUsd(999)).toBe('$999')
    })

    it('keeps the sign in front of the dollar sign for losses', () => {
        expect(formatCompactUsd(-2_500_000)).toBe('-$2.5M')
        expect(formatCompactUsd(-340_000)).toBe('-$340K')
        expect(formatCompactUsd(-500)).toBe('-$500')
    })

    it('returns N/A for non-finite input', () => {
        expect(formatCompactUsd(Infinity)).toBe('N/A')
        expect(formatCompactUsd(-Infinity)).toBe('N/A')
        expect(formatCompactUsd(NaN)).toBe('N/A')
    })

    it('renders zero as $0', () => {
        expect(formatCompactUsd(0)).toBe('$0')
    })
})
