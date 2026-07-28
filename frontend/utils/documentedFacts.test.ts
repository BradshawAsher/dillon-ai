import { describe, expect, it } from 'vitest'

import { deriveDocumentedFacts, deriveDocumentedFactsJson } from './documentedFacts'
import type { SubmissionHistoryItem } from './submissionHistory'

function doc(financialFactsJson: string): SubmissionHistoryItem {
    return { financialFactsJson } as SubmissionHistoryItem
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
