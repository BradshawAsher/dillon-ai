import { describe, it, expect } from 'vitest'
import { riskDotClass } from './riskDot'

describe('riskDotClass', () => {
    it('maps high and critical to the destructive colour', () => {
        expect(riskDotClass('high')).toBe('bg-destructive')
        expect(riskDotClass('Critical')).toBe('bg-destructive')
    })

    it('maps medium and low to amber and emerald', () => {
        expect(riskDotClass('medium')).toBe('bg-amber-500')
        expect(riskDotClass('low')).toBe('bg-emerald-500')
    })

    it('falls back to a muted colour for unknown or missing levels', () => {
        expect(riskDotClass(undefined)).toBe('bg-muted-foreground/40')
        expect(riskDotClass('')).toBe('bg-muted-foreground/40')
        expect(riskDotClass('pending')).toBe('bg-muted-foreground/40')
    })
})
