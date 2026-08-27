import { describe, expect, it } from 'vitest'

import {
    canonicalMetric,
    canonicalPeriod,
    detectContradictions,
    observationsFromDocuments,
    observationsFromRunDocs,
    type FactObservation,
} from './crossDocumentConflicts'

const obs = (sourceDoc: string, metric: string, value: number, period?: string): FactObservation => ({
    sourceDoc, metric, value, period,
})

describe('canonicalMetric', () => {
    it('lowercases, collapses separators, and applies default aliases', () => {
        expect(canonicalMetric('  Total Revenue ')).toBe('revenue')
        expect(canonicalMetric('EBITDA_SDE')).toBe('ebitda')
        expect(canonicalMetric('gross profit')).toBe('gross_profit')
    })

    it('keeps adjusted_ebitda distinct from ebitda unless aliased', () => {
        expect(canonicalMetric('adjusted_ebitda')).toBe('adjusted_ebitda')
        expect(canonicalMetric('adjusted ebitda', { adjusted_ebitda: 'ebitda' })).toBe('ebitda')
    })
})

describe('canonicalPeriod', () => {
    it('buckets TTM/LTM separately and collapses dated periods to a year', () => {
        expect(canonicalPeriod('TTM Jun 2025')).toBe('TTM')
        expect(canonicalPeriod('LTM')).toBe('TTM')
        expect(canonicalPeriod('FY2025')).toBe('2025')
        expect(canonicalPeriod('2024 annual')).toBe('2024')
        expect(canonicalPeriod('')).toBe('')
        expect(canonicalPeriod(undefined)).toBe('')
    })

    it('keeps unparseable labels out of the undated bucket', () => {
        // A non-empty label with no recognizable year must get its own bucket,
        // never collapse to '' alongside genuinely undated facts.
        expect(canonicalPeriod('Q4')).toBe('q4')
        expect(canonicalPeriod('FY19')).toBe('fy19')
        expect(canonicalPeriod('interim period')).toBe('interim_period')
        expect(canonicalPeriod('Q4')).not.toBe(canonicalPeriod(''))
    })
})

describe('detectContradictions', () => {
    it('flags a cross-document disagreement beyond tolerance', () => {
        const records = detectContradictions([
            obs('seller_cim.pdf', 'ebitda', 1_590_000, 'TTM'),
            obs('buyer_model.xlsx', 'ebitda', 1_260_000, 'TTM'),
        ])
        expect(records).toHaveLength(1)
        expect(records[0].metric).toBe('ebitda')
        expect(records[0].period).toBe('TTM')
        expect(records[0].deltaPct).toBeCloseTo(0.2075, 3)
        expect(records[0].severity).toBe('critical')
    })

    it('ignores values within tolerance (rounding noise)', () => {
        const records = detectContradictions([
            obs('a.pdf', 'revenue', 1_000_000, '2024'),
            obs('b.pdf', 'revenue', 1_015_000, '2024'), // 1.5% < 2% tolerance
        ])
        expect(records).toHaveLength(0)
    })

    it('does not compare different periods or TTM vs a fiscal year', () => {
        expect(detectContradictions([
            obs('a.pdf', 'revenue', 1_000_000, '2023'),
            obs('b.pdf', 'revenue', 2_000_000, '2024'),
        ])).toHaveLength(0)
        expect(detectContradictions([
            obs('a.pdf', 'ebitda', 1_000_000, 'TTM'),
            obs('b.pdf', 'ebitda', 2_000_000, 'FY2025'),
        ])).toHaveLength(0)
    })

    it('does not compare an unparseable-period fact against an undated one', () => {
        // "Q4" carries no year, but it is not undated — it must not be assumed
        // equal to a fact with no period at all.
        expect(detectContradictions([
            obs('a.pdf', 'revenue', 1_000_000, 'Q4'),
            obs('b.pdf', 'revenue', 2_000_000, undefined),
        ])).toHaveLength(0)
    })

    it('does not compare two facts from the same document', () => {
        const records = detectContradictions([
            obs('same.pdf', 'cash', 100, '2024'),
            obs('same.pdf', 'cash', 500, '2024'),
        ])
        expect(records).toHaveLength(0)
    })

    it('collapses metric aliases so synonyms compare', () => {
        const records = detectContradictions([
            obs('bank.pdf', 'cash_and_equivalents', 500_000, '2024'),
            obs('bs.pdf', 'cash', 300_000, '2024'),
        ])
        expect(records).toHaveLength(1)
        expect(records[0].metric).toBe('cash')
    })

    it('assigns severity by threshold and sorts most-severe first', () => {
        const records = detectContradictions([
            obs('a.pdf', 'revenue', 100, '2024'),
            obs('b.pdf', 'revenue', 108, '2024'),      // 7.4% -> warning
            obs('c.pdf', 'ebitda', 100, '2024'),
            obs('d.pdf', 'ebitda', 130, '2024'),       // 23% -> critical
        ])
        expect(records[0].severity).toBe('critical')
        expect(records.some((r) => r.severity === 'warning')).toBe(true)
        // 'info' band: > 2% tolerance but < 5% warning
        const info = detectContradictions([
            obs('a.pdf', 'debt', 100, '2024'),
            obs('b.pdf', 'debt', 103, '2024'), // 2.9%
        ])
        expect(info[0].severity).toBe('info')
    })

    it('relates otherwise-distinct metrics via the metricAliases option', () => {
        const observations = [
            obs('seller.pdf', 'adjusted_ebitda', 1_590_000, 'TTM'),
            obs('buyer.xlsx', 'ebitda', 1_260_000, 'TTM'),
        ]
        // Without an alias, adjusted_ebitda and ebitda are separate -> no conflict.
        expect(detectContradictions(observations)).toHaveLength(0)
        // With an alias mapping adjusted_ebitda -> ebitda, they compare.
        const withAlias = detectContradictions(observations, { metricAliases: { adjusted_ebitda: 'ebitda' } })
        expect(withAlias).toHaveLength(1)
        expect(withAlias[0].metric).toBe('ebitda')
    })

    it('merges citations from both sides of a contradiction', () => {
        const records = detectContradictions([
            { sourceDoc: 'a.pdf', metric: 'revenue', value: 100, period: '2024', citations: [{ source_file: 'a.pdf', excerpt: 'A' }] },
            { sourceDoc: 'b.pdf', metric: 'revenue', value: 200, period: '2024', citations: [{ source_file: 'b.pdf', excerpt: 'B' }] },
        ])
        expect(records[0].citations).toHaveLength(2)
        expect(records[0].citations.map((c) => c.excerpt)).toEqual(['A', 'B'])
    })

    it('skips non-finite and zero-scale values', () => {
        expect(detectContradictions([
            obs('a.pdf', 'revenue', Number.NaN, '2024'),
            obs('b.pdf', 'revenue', 100, '2024'),
        ])).toHaveLength(0)
        expect(detectContradictions([
            obs('a.pdf', 'revenue', 0, '2024'),
            obs('b.pdf', 'revenue', 0, '2024'),
        ])).toHaveLength(0)
    })
})

describe('adapters', () => {
    it('observationsFromDocuments emits every competing fact, not just the best', () => {
        const documents = [
            { fileName: 'seller.pdf', financialFactsJson: JSON.stringify([{ metric: 'ebitda', normalized_value: 1_590_000, period: 'TTM' }]) },
            { fileName: 'buyer.xlsx', financialFactsJson: JSON.stringify([{ metric: 'ebitda', normalized_value: 1_260_000, period: 'TTM' }]) },
        ]
        const observations = observationsFromDocuments(documents)
        expect(observations).toHaveLength(2)
        expect(detectContradictions(observations)).toHaveLength(1)
    })

    it('observationsFromDocuments tolerates malformed JSON', () => {
        expect(observationsFromDocuments([{ fileName: 'x.pdf', financialFactsJson: '{not json' }])).toHaveLength(0)
    })

    it('parses formatted string fact values instead of dropping them', () => {
        const documents = [
            { fileName: 'seller.pdf', financialFactsJson: JSON.stringify([{ metric: 'revenue', value: '$4,880,000', period: '2024' }]) },
            { fileName: 'buyer.xlsx', financialFactsJson: JSON.stringify([{ metric: 'revenue', value: '4.2M', period: '2024' }]) },
        ]
        const observations = observationsFromDocuments(documents)
        expect(observations).toHaveLength(2)
        expect(observations.map((o) => o.value)).toEqual([4_880_000, 4_200_000])
        expect(detectContradictions(observations)).toHaveLength(1)
    })

    it('parses negative (loss) figures written with a sign or accounting parens', () => {
        const documents = [
            { fileName: 'seller.pdf', financialFactsJson: JSON.stringify([{ metric: 'ebitda', value: '-$1.2M', period: '2024' }]) },
            { fileName: 'buyer.xlsx', financialFactsJson: JSON.stringify([{ metric: 'ebitda', value: '($900,000)', period: '2024' }]) },
        ]
        const observations = observationsFromDocuments(documents)
        expect(observations.map((o) => o.value)).toEqual([-1_200_000, -900_000])
        // The two losses disagree by a third — a real conflict that used to be dropped.
        expect(detectContradictions(observations)).toHaveLength(1)
    })

    it('observationsFromRunDocs handles both financialFacts and extractedFacts', () => {
        const fromFinancial = observationsFromRunDocs([
            { fileName: 'a', financialFacts: [{ metric: 'revenue', normalizedValue: 100, period: '2024' }] },
        ])
        const fromExtracted = observationsFromRunDocs([
            { fileName: 'b', extractedFacts: [{ metric: 'revenue', normalizedValue: 200, period: '2024' }] },
        ])
        expect(fromFinancial).toHaveLength(1)
        expect(fromExtracted).toHaveLength(1)
        expect(detectContradictions([...fromFinancial, ...fromExtracted])).toHaveLength(1)
    })
})
