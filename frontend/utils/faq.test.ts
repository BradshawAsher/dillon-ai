import { describe, expect, it } from 'vitest'

import { filterFaqs, type FaqLike } from './faq'

const faqs: FaqLike[] = [
    { category: 'getting-started', categoryLabel: 'Getting Started', question: 'How do I upload a deal packet?', answer: 'Drag files into the intake dropzone.' },
    { category: 'valuation', categoryLabel: 'Valuation Math', question: 'How is EBITDA computed?', answer: 'From normalized earnings and add-backs.' },
    { category: 'troubleshooting', categoryLabel: 'Troubleshooting', question: 'What if a document fails?', answer: 'Check the Errors tab and retry.' },
]

describe('filterFaqs', () => {
    it('returns everything with no filter', () => {
        expect(filterFaqs(faqs)).toHaveLength(3)
        expect(filterFaqs(faqs, { category: 'all', query: '' })).toHaveLength(3)
    })

    it('filters by category', () => {
        const out = filterFaqs(faqs, { category: 'valuation' })
        expect(out).toHaveLength(1)
        expect(out[0].question).toContain('EBITDA')
    })

    it('matches the query against question, answer, and category label (case-insensitive)', () => {
        expect(filterFaqs(faqs, { query: 'EBITDA' })).toHaveLength(1) // question
        expect(filterFaqs(faqs, { query: 'add-backs' })).toHaveLength(1) // answer
        expect(filterFaqs(faqs, { query: 'troubleshooting' })).toHaveLength(1) // category label
        expect(filterFaqs(faqs, { query: 'RETRY' })).toHaveLength(1) // case-insensitive
    })

    it('combines category and query (AND)', () => {
        expect(filterFaqs(faqs, { category: 'valuation', query: 'upload' })).toHaveLength(0)
        expect(filterFaqs(faqs, { category: 'valuation', query: 'ebitda' })).toHaveLength(1)
    })

    it('ignores surrounding whitespace in the query', () => {
        expect(filterFaqs(faqs, { query: '   ebitda   ' })).toHaveLength(1)
    })

    it('collapses internal whitespace in both the query and the text', () => {
        // Extra spaces typed in the query still match a normally-spaced answer.
        expect(filterFaqs(faqs, { query: 'normalized    earnings' })).toHaveLength(1)
        // A query matches text whose words are separated by a newline.
        const wrapped: FaqLike[] = [
            { category: 'c', categoryLabel: 'C', question: 'q', answer: 'closing\nescrow holdback' },
        ]
        expect(filterFaqs(wrapped, { query: 'closing escrow' })).toHaveLength(1)
    })

    it('returns empty when nothing matches', () => {
        expect(filterFaqs(faqs, { query: 'zzz-nonexistent' })).toHaveLength(0)
    })
})
