import { describe, expect, it } from 'vitest'

import { resolveFinancialMetricsForProject } from './financialMetrics'

describe('resolveFinancialMetricsForProject', () => {
    it('returns N/A for every metric when nothing is resolvable', () => {
        expect(resolveFinancialMetricsForProject(null)).toEqual({
            askingPrice: 'N/A',
            revenue: 'N/A',
            ebitda: 'N/A',
            valuation: 'N/A',
            multiple: 'N/A',
        })
    })

    it('passes through pre-formatted synthesis fields unchanged', () => {
        const synthesis = {
            askingPrice: '$8,250,000',
            revenueUsd: '$13.39M',
            ebitdaUsd: '$1.50M',
            valuationUsd: '$6.77M - $8.25M',
            impliedMultiple: '5.5x',
        }
        expect(resolveFinancialMetricsForProject(synthesis)).toEqual({
            askingPrice: '$8,250,000',
            revenue: '$13.39M',
            ebitda: '$1.50M',
            valuation: '$6.77M - $8.25M',
            multiple: '5.5x',
        })
    })

    it('formats a bare numeric multiple with a trailing x, not a dollar sign', () => {
        expect(resolveFinancialMetricsForProject({ impliedMultiple: 5.5 }).multiple).toBe('5.5x')
        expect(resolveFinancialMetricsForProject({ multiple: '4.6' }).multiple).toBe('4.6x')
    })

    it('extracts revenue and EBITDA from key takeaways when structured fields are absent', () => {
        const synthesis = {
            keyTakeaways: [
                'Annual revenue reached $13.39M in fiscal 2024',
                'Adjusted EBITDA of $1.50M after normalizations',
            ],
        }
        const resolved = resolveFinancialMetricsForProject(synthesis)
        expect(resolved.revenue).toBe('$13.39M')
        expect(resolved.ebitda).toBe('$1.50M')
    })

    it('falls back to per-document metrics for revenue and EBITDA', () => {
        const resolved = resolveFinancialMetricsForProject({}, [
            { revenueUsd: 5_000_000, ebitda: '$1.2M' },
        ])
        expect(resolved.revenue).toBe('$5,000,000')
        expect(resolved.ebitda).toBe('$1.2M')
    })

    it('formats a negative EBITDA as a signed dollar amount', () => {
        // A loss-making target must not leak an unformatted "-500000".
        expect(resolveFinancialMetricsForProject({ ebitdaUsd: -500_000 }).ebitda).toBe('-$500,000')
    })

    it('leaves a valuation range untouched', () => {
        expect(resolveFinancialMetricsForProject({ valuationUsd: '$6.77M - $8.25M' }).valuation).toBe('$6.77M - $8.25M')
    })
})
