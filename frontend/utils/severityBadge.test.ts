import { describe, it, expect } from 'vitest'
import { severityBadgeClass } from './severityBadge'

describe('severityBadgeClass', () => {
    it('uses destructive styling for critical and high', () => {
        expect(severityBadgeClass('critical')).toContain('text-destructive')
        expect(severityBadgeClass('High')).toContain('text-destructive')
    })

    it('uses amber styling for medium', () => {
        expect(severityBadgeClass('medium')).toContain('amber')
    })

    it('uses muted neutral styling for anything else', () => {
        expect(severityBadgeClass('low')).toContain('text-muted-foreground')
        expect(severityBadgeClass('informational')).toContain('text-muted-foreground')
    })

    it('is trim- and case-insensitive', () => {
        expect(severityBadgeClass('  CRITICAL  ')).toContain('text-destructive')
    })
})
