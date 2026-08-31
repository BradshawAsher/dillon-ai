import { describe, it, expect } from 'vitest'
import { severityForSourceGroup } from './materialImpactSeverity'

describe('severityForSourceGroup', () => {
    it('treats red flags and conflicts as critical', () => {
        expect(severityForSourceGroup('red-flag')).toBe('critical')
        expect(severityForSourceGroup('conflict')).toBe('critical')
    })

    it('treats yellow flags, missing docs, and open questions as medium', () => {
        expect(severityForSourceGroup('yellow-flag')).toBe('medium')
        expect(severityForSourceGroup('missing-document')).toBe('medium')
        expect(severityForSourceGroup('open-question')).toBe('medium')
    })

    it('treats everything else as low', () => {
        expect(severityForSourceGroup('negotiation-lever')).toBe('low')
        expect(severityForSourceGroup('green-flag')).toBe('low')
        expect(severityForSourceGroup('')).toBe('low')
    })
})
