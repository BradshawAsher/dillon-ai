import { describe, expect, it } from 'vitest'

import { formatMagnitude, resolveFinancialMetricsForProject } from './financialMetrics'

describe('formatMagnitude', () => {
    it('compacts thousands, millions, and billions', () => {
        expect(formatMagnitude(750_000)).toBe('$750K')
        expect(formatMagnitude(2_500_000)).toBe('$2.5M')
        expect(formatMagnitude(5_000_000)).toBe('$5M')
        expect(formatMagnitude(1_500_000_000)).toBe('$1.5B')
    })

    it('promotes rounding-carry tier edges instead of a four-digit mantissa', () => {
        // 999,999 must not read as "$1000K"; a near-billion must not read as "$1000M".
        expect(formatMagnitude(999_999)).toBe('$1M')
        expect(formatMagnitude(999_950)).toBe('$1M')
        expect(formatMagnitude(999_995_000)).toBe('$1B')
        // Just below each edge stays in the lower tier.
        expect(formatMagnitude(999_000_000)).toBe('$999M')
    })

    it('returns N/A for a non-numeric input', () => {
        expect(formatMagnitude(Number.NaN)).toBe('N/A')
    })

    it('returns N/A for a non-finite input instead of "$InfinityB"', () => {
        expect(formatMagnitude(Number.POSITIVE_INFINITY)).toBe('N/A')
        expect(formatMagnitude(Number.NEGATIVE_INFINITY)).toBe('N/A')
    })
})

describe('resolveFinancialMetricsForProject', () => {
    it('derives an implied multiple from numeric price and EBITDA', () => {
        const result = resolveFinancialMetricsForProject(
            { askingPrice: 5_000_000, ebitda: 1_000_000 },
            [],
            'Standalone Co',
        )
        expect(result.multiple).toBe('5.0x')
    })

    it('derives a multiple from billion-scale string inputs', () => {
        const result = resolveFinancialMetricsForProject(
            { askingPrice: '$1.2B', ebitda: '$300M' },
            [],
            'Bigco 5571',
        )
        expect(result.multiple).toBe('4.0x')
    })

    it('formats a bare numeric asking price as compact currency', () => {
        const result = resolveFinancialMetricsForProject({ askingPrice: 4_880_000 }, [], 'Nowhere Co')
        expect(result.askingPrice).toBe('$4,880,000')
    })

    it('preserves a billions-suffixed asking price instead of dropping the B', () => {
        const result = resolveFinancialMetricsForProject({ askingPrice: '5.5B' }, [], 'Zzxq 90210')
        expect(result.askingPrice).toBe('5.5B')
    })

    it('resolves an asking price from a string-formatted final-judgment field', () => {
        const result = resolveFinancialMetricsForProject(
            { finalJudgementJson: JSON.stringify({ target_asking_or_loi_price: '$4.88M' }) },
            [],
            'Zephyr Holdings 8823',
        )
        expect(result.askingPrice).toBe('$4.88M')
    })

    it('does not let an unparseable ebitdaExtracted mask a valid metrics.ebitda', () => {
        const result = resolveFinancialMetricsForProject(
            null,
            [{ ebitdaExtracted: 'pending', metrics: { ebitda: 1_500_000 } }],
            'Isolated Target 4471',
        )
        expect(result.ebitda).toBe('$1,500,000')
    })

    it('returns N/A placeholders when nothing is resolvable', () => {
        const result = resolveFinancialMetricsForProject(null, [], 'Unknown Target 9182')
        expect(result.askingPrice).toBe('N/A')
        expect(result.multiple).toBe('N/A')
    })

    it('skips marketing metrics, ratios, and percentages before choosing a monetary fact', () => {
        const result = resolveFinancialMetricsForProject(null, [{ extractedJson: JSON.stringify({ financial_facts: [
            { fact_type: 'revenue', fact_name: 'Revenue campaign impressions', numeric_value: 12_000_000 },
            { fact_type: 'revenue', numeric_value: 1250, text_value: '1250%' },
            { fact_type: 'revenue', fact_name: 'Revenue multiple', numeric_value: 1500, text_value: '1500x' },
            { fact_type: 'revenue', numeric_value: 4.88, text_value: '$4.88M' },
        ] }) }], 'Isolated Target 4471')
        expect(result.revenue).toBe('$4.88M')
    })

    it.each([
        [{ numeric_value: 750, text_value: '$750' }, '$750'],
        [{ numeric_value: 750_000, text_value: '750 thousand' }, '$750K'],
        [{ numeric_value: 4.88, normalized_value: 4_880_000, text_value: '$4.88M' }, '$4.88M'],
        [{ normalizedValue: 5_000 }, '$5K'],
    ])('shares documented-fact normalization for %j', (fields, expected) => {
        const result = resolveFinancialMetricsForProject(null, [{ extractedJson: JSON.stringify({ financial_facts: [
            { fact_type: 'revenue', ...fields },
        ] }) }], 'Isolated Target 4471')
        expect(result.revenue).toBe(expected)
    })

    it('does not use operating income as EBITDA', () => {
        const result = resolveFinancialMetricsForProject(null, [{ extractedJson: JSON.stringify({ financial_facts: [
            { fact_type: 'operating_income', numeric_value: 180_000 },
        ] }) }], 'Isolated Target 4471')
        expect(result.ebitda).toBe('N/A')
    })
})
