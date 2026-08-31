import { describe, it, expect } from 'vitest'
import { getOverallAddBackQuality } from './addBackQuality'

describe('getOverallAddBackQuality', () => {
    it('treats an empty set as clean', () => {
        expect(getOverallAddBackQuality([])).toEqual({ label: 'No add-backs found', variant: 'success' })
    })

    it('needs verification when any item is unsupported', () => {
        expect(getOverallAddBackQuality([
            { quality: 'supported' },
            { quality: 'unsupported' },
            { quality: 'partial' },
        ])).toEqual({ label: 'Add-backs need verification', variant: 'destructive' })
    })

    it('is partial when the worst item is partially supported', () => {
        expect(getOverallAddBackQuality([
            { quality: 'supported' },
            { quality: 'partial' },
        ])).toEqual({ label: 'Partially supported', variant: 'warning' })
    })

    it('is well-supported when every item is supported', () => {
        expect(getOverallAddBackQuality([
            { quality: 'supported' },
            { quality: 'supported' },
        ])).toEqual({ label: 'Well-supported', variant: 'success' })
    })

    it('prioritises unsupported over partial', () => {
        expect(getOverallAddBackQuality([
            { quality: 'partial' },
            { quality: 'unsupported' },
        ]).variant).toBe('destructive')
    })
})
