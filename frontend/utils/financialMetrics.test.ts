import { describe, expect, it } from 'vitest'

import {
    calculateValuationDelta,
    formatMagnitude,
    formatSignedMagnitude,
    resolveFinancialMetricsForProject,
} from './financialMetrics'

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

    it('places the sign before the dollar sign for negative magnitudes', () => {
        expect(formatMagnitude(-500_000)).toBe('-$500K')
        expect(formatMagnitude(-2_000_000)).toBe('-$2M')
        expect(formatMagnitude(-1_500_000_000)).toBe('-$1.5B')
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

    it('reads the canonical finalJudgmentJson field', () => {
        const result = resolveFinancialMetricsForProject(
            { finalJudgmentJson: JSON.stringify({ target_asking_or_loi_price: '$12.5M' }) },
            [],
            'Isolated Tutorial Fixture 8492',
        )
        expect(result.askingPrice).toBe('$12.5M')
    })

    it('keeps a revenue amount that appears before the revenue label', () => {
        const result = resolveFinancialMetricsForProject(
            { keyTakeaways: ['Verified $15.8M TTM Revenue and $3.2M normalized EBITDA.'] },
            [],
            'Apex Tutorial Fixture',
        )
        expect(result.revenue).toBe('$15.8M')
        expect(result.ebitda).toBe('$3.2M')
    })

    it('reads a top-level asking price from extracted document JSON', () => {
        const result = resolveFinancialMetricsForProject(
            null,
            [{ extractedJson: JSON.stringify({ askingPrice: 12_500_000 }) }],
            'Isolated Tutorial Fixture 8492',
        )
        expect(result.askingPrice).toBe('$12.5M')
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

describe('calculateValuationDelta', () => {
    it('calculates a negotiation target when model base is below seller ask', () => {
        const result = calculateValuationDelta('$10.3M', '$14.2M')
        expect(result).toMatchObject({
            sellerAsk: 14_200_000,
            modelBase: 10_300_000,
            delta: -3_900_000,
            direction: 'negotiation_target',
        })
        expect(Math.round(result!.percentOfAsk)).toBe(27)
        expect(formatSignedMagnitude(result!.delta)).toBe('-$3.9M')
    })

    it('calculates a model premium when model base is above seller ask', () => {
        const result = calculateValuationDelta(12_000_000, '$10M')
        expect(result).toMatchObject({ delta: 2_000_000, direction: 'model_premium' })
        expect(result!.percentOfAsk).toBe(20)
        expect(formatSignedMagnitude(result!.delta)).toBe('+$2M')
    })

    it('returns an at-ask result when the values are equal', () => {
        expect(calculateValuationDelta('$8.8M', '$8.8M')).toMatchObject({
            delta: 0,
            percentOfAsk: 0,
            direction: 'at_ask',
        })
    })

    it.each([
        [undefined, '$10M'],
        ['$8M', 'N/A'],
        ['$8M', 0],
    ])('returns null when a usable comparison is unavailable', (base, ask) => {
        expect(calculateValuationDelta(base, ask)).toBeNull()
    })
})
