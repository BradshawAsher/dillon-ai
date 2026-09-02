import { describe, expect, it } from 'vitest'

import { formatConfidencePercent } from './confidencePercent'

describe('formatConfidencePercent', () => {
    it('passes through a whole percent', () => {
        expect(formatConfidencePercent('87')).toBe('87%')
        expect(formatConfidencePercent('87.4')).toBe('87%')
    })

    it('scales a fraction to a percent', () => {
        expect(formatConfidencePercent('0.82')).toBe('82%')
        expect(formatConfidencePercent('1')).toBe('100%')
        expect(formatConfidencePercent('0')).toBe('0%')
    })

    it('returns null when there is nothing usable', () => {
        expect(formatConfidencePercent(undefined)).toBeNull()
        expect(formatConfidencePercent(null)).toBeNull()
        expect(formatConfidencePercent('')).toBeNull()
        expect(formatConfidencePercent('high')).toBeNull()
    })
})
