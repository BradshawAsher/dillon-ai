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
})
