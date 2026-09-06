import { describe, expect, it } from 'vitest'

import { classifyAddBackSupport, extractAddBackAmount, parseAddBackItems } from './addBackItems'

const finding = (text: string, overrides: Record<string, unknown> = {}) => ({
    text,
    confidence: null,
    severity: '',
    impact: '',
    status: '',
    citations: [],
    ...overrides,
})

const synthesis = (groups: Record<string, unknown[]>) => ({
    structuredFindings: {
        redFlags: [], yellowFlags: [], crossDocumentConflicts: [], openQuestions: [],
        negotiationLevers: [], keyTakeaways: [], greenFlags: [], missingDocuments: [],
        ...groups,
    },
    redFlags: [], yellowFlags: [], crossDocumentConflicts: [], openQuestions: [],
    negotiationLevers: [], keyTakeaways: [],
} as any)

describe('extractAddBackAmount', () => {
    it('selects the amount nearest the add-back phrase instead of an EBITDA figure', () => {
        expect(extractAddBackAmount('Seller EBITDA is $1.59M and includes an unsupported add-back of $333k.')).toBe(333_000)
    })
})

describe('classifyAddBackSupport', () => {
    it('does not default uncited prose to supported', () => {
        expect(classifyAddBackSupport({ text: '$50k owner add-back', origin: 'redFlags' })).toBe('partial')
    })

    it('requires affirmative support and evidence for supported status', () => {
        expect(classifyAddBackSupport({
            text: '$50k confirmed non-recurring relocation add-back',
            origin: 'keyTakeaways',
            status: 'confirmed',
            confidence: 0.95,
            hasCitation: true,
        })).toBe('supported')
    })

    it('treats open questions and explicit unsupported language conservatively', () => {
        expect(classifyAddBackSupport({ text: 'Can seller support the $80k add-back?', origin: 'openQuestions' })).toBe('unsupported')
        expect(classifyAddBackSupport({ text: 'The $80k add-back is unsubstantiated', origin: 'redFlags' })).toBe('unsupported')
    })
})

describe('parseAddBackItems', () => {
    it('does not count the aggregate total in addition to individual line items', () => {
        const items = parseAddBackItems(synthesis({
            redFlags: [finding('Unsupported vehicle add-back of $40,000')],
        }), { add_backs: { value: 100_000, status: 'confirmed' } })

        expect(items).toHaveLength(1)
        expect(items[0].amount).toBe(40_000)
    })

    it('deduplicates the same structured finding across synthesis groups', () => {
        const duplicate = finding('Partially supported owner salary add-back of $75,000')
        const items = parseAddBackItems(synthesis({ redFlags: [duplicate], negotiationLevers: [duplicate] }), {})
        expect(items).toHaveLength(1)
        expect(items[0].quality).toBe('partial')
    })

    it('shows an aggregate-only total as one partial claim rather than supported', () => {
        const items = parseAddBackItems(undefined, { add_backs: { value: 125_000, status: 'confirmed' } })
        expect(items).toMatchObject([{ amount: 125_000, quality: 'partial' }])
    })
})
