import { describe, it, expect } from 'vitest'
import { riskLevelVariant } from './riskVariant'

describe('riskLevelVariant', () => {
    it('maps critical and high to destructive', () => {
        expect(riskLevelVariant('critical')).toBe('destructive')
        expect(riskLevelVariant('High')).toBe('destructive')
    })

    it('maps medium to warning and low to secondary', () => {
        expect(riskLevelVariant('medium')).toBe('warning')
        expect(riskLevelVariant('low')).toBe('secondary')
    })

    it('is case- and whitespace-insensitive', () => {
        expect(riskLevelVariant('  CRITICAL ')).toBe('destructive')
    })

    it('falls back to outline for unknown or empty levels', () => {
        expect(riskLevelVariant('')).toBe('outline')
        expect(riskLevelVariant('pending')).toBe('outline')
    })
})
