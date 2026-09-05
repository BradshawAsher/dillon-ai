import { describe, expect, it } from 'vitest'

import { formatRelativeTime } from './relativeTime'

const NOW = 1_700_000_000_000

describe('formatRelativeTime', () => {
    it('reports a zero timestamp as pending', () => {
        expect(formatRelativeTime(0, NOW)).toBe('Pending')
    })

    it('reports a non-finite timestamp as pending', () => {
        expect(formatRelativeTime(Number.NaN, NOW)).toBe('Pending')
        expect(formatRelativeTime(Number.POSITIVE_INFINITY, NOW)).toBe('Pending')
    })

    it('reports sub-minute gaps as just now', () => {
        expect(formatRelativeTime(NOW - 30_000, NOW)).toBe('Just now')
        expect(formatRelativeTime(NOW, NOW)).toBe('Just now')
    })

    it('reports minutes, hours, and days with the right banding', () => {
        expect(formatRelativeTime(NOW - 12 * 60_000, NOW)).toBe('12m ago')
        expect(formatRelativeTime(NOW - 5 * 3_600_000, NOW)).toBe('5h ago')
        expect(formatRelativeTime(NOW - 3 * 86_400_000, NOW)).toBe('3d ago')
    })

    it('collapses future timestamps to just now', () => {
        expect(formatRelativeTime(NOW + 10 * 60_000, NOW)).toBe('Just now')
    })
})
