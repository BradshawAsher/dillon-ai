import { describe, expect, it } from 'vitest'

import { formatEasternTime } from './dateTime'

describe('formatEasternTime', () => {
    it('returns the fallback for blank input', () => {
        expect(formatEasternTime('')).toBe('Pending')
        expect(formatEasternTime('   ')).toBe('Pending')
    })

    it('honours a custom fallback', () => {
        expect(formatEasternTime('', 'Not started')).toBe('Not started')
    })

    it('passes through strings that are not parseable dates', () => {
        expect(formatEasternTime('not-a-date')).toBe('not-a-date')
    })

    it('accepts an epoch-millisecond timestamp string', () => {
        // 2024-01-15T17:30:00Z in epoch ms.
        const formatted = formatEasternTime(String(Date.parse('2024-01-15T17:30:00Z')))
        expect(formatted).toContain('Jan 15, 2024')
        expect(formatted).toContain('12:30')
    })

    it('accepts an epoch-second timestamp string', () => {
        const seconds = Math.floor(Date.parse('2024-01-15T17:30:00Z') / 1000)
        const formatted = formatEasternTime(String(seconds))
        expect(formatted).toContain('Jan 15, 2024')
        expect(formatted).toContain('12:30')
    })

    it('formats a UTC timestamp in the America/New_York zone', () => {
        // 17:30 UTC in January is 12:30 EST.
        const formatted = formatEasternTime('2024-01-15T17:30:00Z')
        expect(formatted).toContain('Jan 15, 2024')
        expect(formatted).toContain('12:30')
        expect(formatted).toContain('EST')
    })

    it('reflects daylight saving time in summer', () => {
        // 17:30 UTC in July is 13:30 EDT.
        const formatted = formatEasternTime('2024-07-15T17:30:00Z')
        expect(formatted).toContain('1:30')
        expect(formatted).toContain('EDT')
    })
})
