import { describe, expect, it } from 'vitest'

import { percentMargin } from './percentMargin'

describe('percentMargin', () => {
    it('computes the percentage above breakeven', () => {
        expect(percentMargin(120, 100)).toBe(20)
        expect(percentMargin(80, 100)).toBe(-20)
        expect(percentMargin(100, 100)).toBe(0)
    })

    it('returns null when the breakeven denominator is zero', () => {
        // All-equity deal: debt service and capex are 0, so breakeven collapses
        // to 0 — this must not render as Infinity% margin.
        expect(percentMargin(500_000, 0)).toBeNull()
    })

    it('returns null for non-finite inputs', () => {
        expect(percentMargin(Infinity, 100)).toBeNull()
        expect(percentMargin(100, NaN)).toBeNull()
    })
})
