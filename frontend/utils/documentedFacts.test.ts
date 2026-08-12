import { describe, expect, it } from 'vitest'

import { deriveDocumentedFacts, deriveDocumentedFactsJson, deriveDocumentedFactsWithConflicts } from './documentedFacts'
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

    it('prefers the latest period for the same metric', () => {
        const facts = JSON.stringify([
            fact({ normalized_value: 100, period: 'FY2022' }),
            fact({ normalized_value: 200, period: 'FY2024' }),
            fact({ normalized_value: 150, period: 'FY2023' }),
        ])
        expect(deriveDocumentedFacts([doc(facts)]).revenue.value).toBe(200)
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
