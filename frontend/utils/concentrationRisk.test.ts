import { describe, it, expect } from 'vitest'
import { getConcentrationRisk, maxRevenueShare } from './concentrationRisk'

describe('getConcentrationRisk', () => {
    it('flags high risk when a single customer exceeds 40% of revenue', () => {
        expect(getConcentrationRisk([{ revenueShare: 0.41 }])).toEqual({
            label: 'High concentration risk',
            variant: 'destructive',
        })
    })

    it('flags high risk when any finding is marked critical, regardless of share', () => {
        expect(getConcentrationRisk([{ revenueShare: 0.1, severity: 'critical' }]).variant).toBe('destructive')
    })

    it('flags moderate risk above 20% share', () => {
        expect(getConcentrationRisk([{ revenueShare: 0.25 }])).toEqual({
            label: 'Moderate concentration',
            variant: 'warning',
        })
    })

    it('treats any finding at all as at least moderate', () => {
        expect(getConcentrationRisk([{ revenueShare: null }]).variant).toBe('warning')
    })

    it('reports diversified when there are no findings', () => {
        expect(getConcentrationRisk([])).toEqual({ label: 'Diversified', variant: 'success' })
    })

    it('picks the largest customer share across findings', () => {
        expect(getConcentrationRisk([
            { revenueShare: 0.1 },
            { revenueShare: 0.45 },
            { revenueShare: 0.05 },
        ]).variant).toBe('destructive')
    })

    it('handles a very large fragmented customer base without overflowing the stack', () => {
        const many = Array.from({ length: 200_000 }, () => ({ revenueShare: 0.001 }))
        many.push({ revenueShare: 0.5 })
        expect(() => getConcentrationRisk(many)).not.toThrow()
        expect(getConcentrationRisk(many).variant).toBe('destructive')
    })

    it('ignores a non-finite share instead of letting it poison the max', () => {
        expect(getConcentrationRisk([
            { revenueShare: NaN },
            { revenueShare: 0.45 },
        ]).variant).toBe('destructive')
        // A lone NaN share should not read as high risk.
        expect(getConcentrationRisk([{ revenueShare: NaN }]).variant).toBe('warning')
    })

    it('detects a critical finding regardless of severity casing', () => {
        expect(getConcentrationRisk([{ revenueShare: 0.1, severity: 'Critical' }]).variant).toBe('destructive')
    })
})

describe('maxRevenueShare', () => {
    it('returns the largest finite revenue share and treats null/NaN as 0', () => {
        expect(maxRevenueShare([{ revenueShare: 0.1 }, { revenueShare: 0.35 }, { revenueShare: null }])).toBe(0.35)
        expect(maxRevenueShare([{ revenueShare: NaN }])).toBe(0)
        expect(maxRevenueShare([])).toBe(0)
    })

    it('does not overflow on a very large findings array', () => {
        const many = Array.from({ length: 200_000 }, () => ({ revenueShare: 0.001 }))
        expect(() => maxRevenueShare(many)).not.toThrow()
    })
})
