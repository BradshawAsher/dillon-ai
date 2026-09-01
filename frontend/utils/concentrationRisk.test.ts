import { describe, it, expect } from 'vitest'
import { getConcentrationRisk } from './concentrationRisk'

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
})
