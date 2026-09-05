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

    it('clamps out-of-range values into 0..100', () => {
        expect(formatConfidencePercent('150')).toBe('100%')
        expect(formatConfidencePercent('-0.4')).toBe('0%')
        expect(formatConfidencePercent('-40')).toBe('0%')
    })

    it('returns null when there is nothing usable', () => {
        expect(formatConfidencePercent(undefined)).toBeNull()
        expect(formatConfidencePercent(null)).toBeNull()
        expect(formatConfidencePercent('')).toBeNull()
        expect(formatConfidencePercent('high')).toBeNull()
        expect(formatConfidencePercent(Number.NaN)).toBeNull()
        expect(formatConfidencePercent(Number.POSITIVE_INFINITY)).toBeNull()
    })

    it('accepts a numeric confidence the same way as a string', () => {
        expect(formatConfidencePercent(87)).toBe('87%')
        expect(formatConfidencePercent(0.82)).toBe('82%')
        expect(formatConfidencePercent(1)).toBe('100%')
        expect(formatConfidencePercent(0)).toBe('0%')
    })

    it('honors an explicit percent sign so 1% is not scaled to 100%', () => {
        expect(formatConfidencePercent('1%')).toBe('1%')
        expect(formatConfidencePercent('85%')).toBe('85%')
        expect(formatConfidencePercent('0.5%')).toBe('1%')
    })
})
