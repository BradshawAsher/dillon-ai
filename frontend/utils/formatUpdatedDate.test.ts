import { describe, expect, it } from 'vitest'

import { formatUpdatedDate } from './formatUpdatedDate'

describe('formatUpdatedDate', () => {
    it('returns null for empty or missing input', () => {
        expect(formatUpdatedDate(undefined)).toBeNull()
        expect(formatUpdatedDate(null)).toBeNull()
        expect(formatUpdatedDate('')).toBeNull()
    })

    it('returns null for an unparseable timestamp', () => {
        expect(formatUpdatedDate('not-a-date')).toBeNull()
    })

    it('formats a valid ISO timestamp to a short date string', () => {
        const label = formatUpdatedDate('2026-09-01T12:00:00.000Z')
        // Exact wording is locale-dependent; assert it produced a real label
        // that carries the year rather than "Invalid Date".
        expect(label).not.toBeNull()
        expect(label).toContain('2026')
        expect(label).not.toContain('Invalid')
    })

    it('formats a numeric millisecond epoch the same way as an ISO string', () => {
        const iso = formatUpdatedDate('2026-09-01T12:00:00.000Z')
        const fromMs = formatUpdatedDate(Date.parse('2026-09-01T12:00:00.000Z'))
        expect(fromMs).toBe(iso)
    })

    it('formats a 10-digit unix-seconds epoch instead of dropping the label', () => {
        const label = formatUpdatedDate(1_725_196_800) // 2024-09-01T12:00:00Z
        expect(label).not.toBeNull()
        expect(label).toContain('2024')
        expect(label).not.toContain('Invalid')
    })

    it('does not treat a bare year as an epoch (which would render as 1970)', () => {
        expect(formatUpdatedDate('2026')).toBeNull()
        expect(formatUpdatedDate(2026)).toBeNull()
    })

    it('returns null for non-finite numeric input', () => {
        expect(formatUpdatedDate(Number.NaN)).toBeNull()
        expect(formatUpdatedDate(Number.POSITIVE_INFINITY)).toBeNull()
        expect(formatUpdatedDate(0)).toBeNull()
    })
})
