import { describe, it, expect } from 'vitest'
import { riskSignalVariant, entryMultipleVariant } from './dealHealthSignals'

describe('riskSignalVariant', () => {
    it('maps red / critical / high to destructive', () => {
        expect(riskSignalVariant('red', '')).toBe('destructive')
        expect(riskSignalVariant('', 'critical')).toBe('destructive')
        expect(riskSignalVariant('', 'high')).toBe('destructive')
    })

    it('maps yellow / medium to warning', () => {
        expect(riskSignalVariant('yellow', '')).toBe('warning')
        expect(riskSignalVariant('', 'medium')).toBe('warning')
    })

    it('treats green / low / empty as success', () => {
        expect(riskSignalVariant('green', 'low')).toBe('success')
        expect(riskSignalVariant('', '')).toBe('success')
        expect(riskSignalVariant(null, null)).toBe('success')
    })

    it('is case- and whitespace-insensitive', () => {
        expect(riskSignalVariant('  RED  ', '')).toBe('destructive')
    })

    it('lets a red traffic light win even when the risk level reads low', () => {
        expect(riskSignalVariant('red', 'low')).toBe('destructive')
    })
})

describe('entryMultipleVariant', () => {
    it('flags expensive multiples above 12x as destructive', () => {
        expect(entryMultipleVariant(12.1)).toBe('destructive')
    })

    it('warns between 7x and 12x', () => {
        expect(entryMultipleVariant(8)).toBe('warning')
        expect(entryMultipleVariant(12)).toBe('warning')
    })

    it('treats 7x and below as healthy', () => {
        expect(entryMultipleVariant(7)).toBe('success')
        expect(entryMultipleVariant(4.5)).toBe('success')
    })
})
