import { describe, it, expect } from 'vitest'
import { getSeverityForGroup, type InsightGroupType } from './insightGroups'

describe('getSeverityForGroup', () => {
    it('rates red flags and conflicts critical', () => {
        expect(getSeverityForGroup('red-flag')).toBe('critical')
        expect(getSeverityForGroup('conflict')).toBe('critical')
    })

    it('rates yellow flags, missing docs, and open questions medium', () => {
        expect(getSeverityForGroup('yellow-flag')).toBe('medium')
        expect(getSeverityForGroup('missing-document')).toBe('medium')
        expect(getSeverityForGroup('open-question')).toBe('medium')
    })

    it('rates green flags low', () => {
        expect(getSeverityForGroup('green-flag')).toBe('low')
    })

    it('rates takeaways and negotiation levers informational', () => {
        expect(getSeverityForGroup('takeaway')).toBe('informational')
        expect(getSeverityForGroup('negotiation-lever')).toBe('informational')
    })

    it('assigns a severity to every group type', () => {
        const all: InsightGroupType[] = [
            'red-flag', 'yellow-flag', 'green-flag', 'takeaway',
            'conflict', 'negotiation-lever', 'missing-document', 'open-question',
        ]
        for (const g of all) {
            expect(['critical', 'medium', 'low', 'informational']).toContain(getSeverityForGroup(g))
        }
    })
})
