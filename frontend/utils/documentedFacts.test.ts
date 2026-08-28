import { describe, expect, it } from 'vitest'

import { deriveDocumentedFacts, deriveDocumentedFactsJson, deriveDocumentedFactsWithConflicts, parseMagnitudeMoney } from './documentedFacts'
import type { SubmissionHistoryItem } from './submissionHistory'

function doc(financialFactsJson: string, fileName = 'doc.pdf'): SubmissionHistoryItem {
    return { financialFactsJson, fileName } as SubmissionHistoryItem
}

function fact(overrides: Record<string, unknown>) {
    return { metric: 'revenue', normalized_value: 1000, ...overrides }
}

describe('deriveDocumentedFacts', () => {
    it('returns an empty object when there are no documents or facts', () => {
        expect(deriveDocumentedFacts([])).toEqual({})
        expect(deriveDocumentedFacts([doc('')])).toEqual({})
    })

    it('ignores malformed JSON and non-array payloads', () => {
        expect(deriveDocumentedFacts([doc('{not json')])).toEqual({})
        expect(deriveDocumentedFacts([doc('{"metric":"revenue"}')])).toEqual({})
    })

    it('drops facts without a metric or a finite numeric value', () => {
        const facts = JSON.stringify([
            { metric: '', normalized_value: 500 },
            { metric: 'ebitda_sde', normalized_value: 'oops' },
            fact({ normalized_value: 1000 }),
        ])
        const result = deriveDocumentedFacts([doc(facts)])
        expect(Object.keys(result)).toEqual(['revenue'])
        expect(result.revenue.value).toBe(1000)
    })

    it('clamps an out-of-range fact confidence to 0..100', () => {
        const high = JSON.stringify([fact({ normalized_value: 1000, confidence: 150 })])
        expect(deriveDocumentedFacts([doc(high)]).revenue.confidence).toBe(100)

        const negative = JSON.stringify([fact({ normalized_value: 1000, confidence: -0.5 })])
        expect(deriveDocumentedFacts([doc(negative)]).revenue.confidence).toBe(0)

        // A normal fractional confidence still scales to a whole percent.
        const fractional = JSON.stringify([fact({ normalized_value: 1000, confidence: 0.82 })])
        expect(deriveDocumentedFacts([doc(fractional)]).revenue.confidence).toBe(82)
    })

    it('prefers the latest period for the same metric', () => {
        const facts = JSON.stringify([
            fact({ normalized_value: 100, period: 'FY2022' }),
            fact({ normalized_value: 200, period: 'FY2024' }),
            fact({ normalized_value: 150, period: 'FY2023' }),
        ])
        expect(deriveDocumentedFacts([doc(facts)]).revenue.value).toBe(200)
    })

    it('treats an undated TTM label as more recent than a dated fiscal year', () => {
        const facts = JSON.stringify([
            fact({ normalized_value: 200, period: 'FY2024' }),
            fact({ normalized_value: 250, period: 'TTM' }),
        ])
        expect(deriveDocumentedFacts([doc(facts)]).revenue.value).toBe(250)
    })

    it('still ranks a dated TTM label by its explicit year', () => {
        const facts = JSON.stringify([
            fact({ normalized_value: 250, period: 'TTM 2022' }),
            fact({ normalized_value: 300, period: 'FY2024' }),
        ])
        expect(deriveDocumentedFacts([doc(facts)]).revenue.value).toBe(300)
    })

    it('prefers a confirmed fact over an unconfirmed one in the same period', () => {
        const facts = JSON.stringify([
            fact({ normalized_value: 100, period: 'FY24', status: 'reported', confidence: 0.9 }),
            fact({ normalized_value: 200, period: 'FY24', status: 'confirmed', confidence: 0.5 }),
        ])
        expect(deriveDocumentedFacts([doc(facts)]).revenue.value).toBe(200)
    })

    it('normalises fractional confidence to a 0-100 scale', () => {
        const result = deriveDocumentedFacts([doc(JSON.stringify([fact({ confidence: 0.87 })]))])
        expect(result.revenue.confidence).toBe(87)
    })

    it('carries a citation through when present', () => {
        const facts = JSON.stringify([
            fact({ citation: { source_file: 'q4.pdf', row_or_cell: 'Page 3', excerpt: 'Revenue was $1,000' } }),
        ])
        expect(deriveDocumentedFacts([doc(facts)]).revenue.citations[0]).toEqual({
            source_file: 'q4.pdf',
            row_or_cell: 'Page 3',
            excerpt: 'Revenue was $1,000',
        })
    })

    it('falls back to page_number when row_or_cell is missing', () => {
        const facts = JSON.stringify([
            fact({ citation: { source_file: 'q4.pdf', page_number: 7, excerpt: 'Revenue was $1,000' } }),
        ])
        expect(deriveDocumentedFacts([doc(facts)]).revenue.citations[0]).toEqual({
            source_file: 'q4.pdf',
            row_or_cell: 'Page 7',
            excerpt: 'Revenue was $1,000',
        })
    })

    it('prefers explicit facts over reconstructed ones in the same period', () => {
        const facts = JSON.stringify([
            fact({ normalized_value: 25000, period: 'TTM', status: 'confirmed', confidence: 0.95, provenance: 'Calculated from uploaded documents', formula: 'Revenue - OpEx', citation: { source_file: 'calc.pdf', row_or_cell: 'Page 4', excerpt: 'Reconstructed from formula' } }),
            fact({ metric: 'revenue', normalized_value: 24000, period: 'TTM', status: 'confirmed', confidence: 0.6, citation: { source_file: 'stated.pdf', row_or_cell: 'Page 2', excerpt: 'Revenue stated directly' } }),
        ])
        const result = deriveDocumentedFacts([doc(facts)])
        expect(result.revenue.value).toBe(24000)
        expect(result.revenue.provenance).toBe('Extracted from uploaded documents')
    })
})

describe('extracted financial fact classification', () => {
    function extracted(facts: unknown[]) {
        return deriveDocumentedFacts([{ fileName: 'statement.pdf', extractedJson: JSON.stringify({ financial_facts: facts }) } as SubmissionHistoryItem])
    }

    it.each([
        [{ numeric_value: 4.88, text_value: '$4.88M' }, 4_880_000],
        [{ numeric_value: 1.5, text_value: '$1.5bn' }, 1_500_000_000],
        [{ numeric_value: 750, text_value: '$750' }, 750],
        [{ numeric_value: 750_000, text_value: '750 thousand' }, 750_000],
        [{ numeric_value: 4.88, normalized_value: 4_880_000, text_value: '$4.88M' }, 4_880_000],
        [{ normalizedValue: 5_000 }, 5_000],
        [{ numeric_value: 4.88, value: '$4.88M' }, 4_880_000],
    ])('normalizes monetary units without a minimum amount or double scaling: %j', (fields, expected) => {
        expect(extracted([{ fact_type: 'revenue', ...fields }]).revenue.value).toBe(expected)
    })

    it.each([
        { fact_type: 'revenue', fact_name: 'Revenue campaign impressions', numeric_value: 12_000_000 },
        { fact_type: 'revenue', fact_name: 'Revenue growth', numeric_value: 1250, text_value: '1250%' },
        { fact_type: 'revenue', numeric_value: 1250, unit: 'percent' },
        { fact_type: 'ebitda', fact_name: 'EBITDA margin', numeric_value: 30 },
        { fact_type: 'case_study', fact_name: 'Revenue multiple', numeric_value: 5, text_value: '5x' },
    ])('excludes non-company amounts even with a broad financial type: %j', fields => {
        expect(extracted([fields])).toEqual({})
    })

    it('classifies explicit multiples before monetary metrics, without assuming a denominator', () => {
        const facts = extracted([
            { fact_type: 'ebitda', fact_name: 'EBITDA multiple', text_value: '4.5x' },
            { fact_type: 'revenue_multiple', numeric_value: 3, currency: 'USD' },
            { fact_type: 'valuation_multiple', numeric_value: 6 },
        ])
        expect(Object.keys(facts).sort()).toEqual(['ebitda_multiple', 'revenue_multiple'])
        expect(facts.ebitda_multiple.value).toBe(4.5)
        expect(facts.revenue_multiple).toMatchObject({ value: 3, currency: 'x' })
    })

    it('does not relabel operating income as EBITDA and supports dated EBITDA labels', () => {
        expect(extracted([{ fact_type: 'operating_income', numeric_value: 180_000 }]).ebitda_sde).toBeUndefined()
        expect(extracted([{ fact_name: 'TTM May 2027 adjusted EBITDA', numeric_value: 250_000 }]).ebitda_sde.value).toBe(250_000)
    })

    it('skips malformed entries and keeps the currency on the purchase-price alias', () => {
        const facts = extracted([null, { fact_type: 'asking_price', numeric_value: 50_000, currency: 'CAD' }])
        expect(facts.asking_price).toMatchObject({ value: 50_000, currency: 'CAD' })
        expect(facts.purchase_price).toMatchObject({ value: 50_000, currency: 'CAD' })
    })
})

describe('deriveDocumentedFactsJson', () => {
    it('returns an empty string when nothing usable is found', () => {
        expect(deriveDocumentedFactsJson([])).toBe('')
    })

    it('round-trips derived facts through JSON', () => {
        const json = deriveDocumentedFactsJson([doc(JSON.stringify([fact({ normalized_value: 4200 })]))])
        expect(JSON.parse(json).revenue.value).toBe(4200)
    })
})

describe('deriveDocumentedFactsWithConflicts', () => {
    it('returns facts identical to deriveDocumentedFacts plus detected conflicts', () => {
        const a = doc(JSON.stringify([fact({ metric: 'ebitda', normalized_value: 1_590_000, period: 'TTM' })]), 'seller.pdf')
        const b = doc(JSON.stringify([fact({ metric: 'ebitda', normalized_value: 1_260_000, period: 'TTM' })]), 'buyer.xlsx')
        const documents = [a, b]

        const { facts, conflicts } = deriveDocumentedFactsWithConflicts(documents)
        // facts must be byte-for-byte what the untouched function returns.
        expect(facts).toEqual(deriveDocumentedFacts(documents))
        // and the competing values it discards are surfaced as a conflict.
        expect(conflicts).toHaveLength(1)
        expect(conflicts[0].metric).toBe('ebitda')
        expect(conflicts[0].severity).toBe('critical')
    })

    it('reports no conflicts when documents agree', () => {
        const a = doc(JSON.stringify([fact({ metric: 'revenue', normalized_value: 1_000_000, period: '2024' })]), 'a.pdf')
        const b = doc(JSON.stringify([fact({ metric: 'revenue', normalized_value: 1_005_000, period: '2024' })]), 'b.pdf')
        expect(deriveDocumentedFactsWithConflicts([a, b]).conflicts).toHaveLength(0)
    })
})

describe('parseMagnitudeMoney', () => {
    it('returns null for empty or nullish input', () => {
        expect(parseMagnitudeMoney(null)).toBeNull()
        expect(parseMagnitudeMoney(undefined)).toBeNull()
        expect(parseMagnitudeMoney('')).toBeNull()
        expect(parseMagnitudeMoney('   ')).toBeNull()
    })

    it('passes finite numbers through and rejects non-finite ones', () => {
        expect(parseMagnitudeMoney(1_500_000)).toBe(1_500_000)
        expect(parseMagnitudeMoney(0)).toBe(0)
        expect(parseMagnitudeMoney(Number.NaN)).toBeNull()
        expect(parseMagnitudeMoney(Number.POSITIVE_INFINITY)).toBeNull()
    })

    it('applies single-letter magnitude suffixes', () => {
        expect(parseMagnitudeMoney('$1.5K')).toBe(1_500)
        expect(parseMagnitudeMoney('$1.5M')).toBe(1_500_000)
        expect(parseMagnitudeMoney('$1.5B')).toBe(1_500_000_000)
    })

    it('returns null for a digitless magnitude suffix rather than reading it as $0', () => {
        expect(parseMagnitudeMoney('$M')).toBeNull()
        expect(parseMagnitudeMoney('$K')).toBeNull()
        expect(parseMagnitudeMoney('$bn')).toBeNull()
        expect(parseMagnitudeMoney('$')).toBeNull()
    })

    it('applies the two-letter finance shorthands MM and bn', () => {
        expect(parseMagnitudeMoney('$1.5MM')).toBe(1_500_000)
        expect(parseMagnitudeMoney('2mm')).toBe(2_000_000)
        expect(parseMagnitudeMoney('$1.5bn')).toBe(1_500_000_000)
        expect(parseMagnitudeMoney('3 BN')).toBe(3_000_000_000)
    })

    it('applies spelled-out magnitude words', () => {
        expect(parseMagnitudeMoney('$1.5 million')).toBe(1_500_000)
        expect(parseMagnitudeMoney('2 BILLION')).toBe(2_000_000_000)
        expect(parseMagnitudeMoney('750 thousand')).toBe(750_000)
        // Word and shorthand forms must agree.
        expect(parseMagnitudeMoney('1.5 million')).toBe(parseMagnitudeMoney('1.5M'))
    })

    it('strips currency codes, symbols, and separators', () => {
        expect(parseMagnitudeMoney('USD 2,500,000')).toBe(2_500_000)
        expect(parseMagnitudeMoney('$2,500,000')).toBe(2_500_000)
        expect(parseMagnitudeMoney('EUR 4M')).toBe(4_000_000)
    })

    it('rejects negative amounts and unparseable strings', () => {
        expect(parseMagnitudeMoney('-$1.5M')).toBeNull()
        expect(parseMagnitudeMoney('N/A')).toBeNull()
        expect(parseMagnitudeMoney('5x')).toBeNull()
    })
})
