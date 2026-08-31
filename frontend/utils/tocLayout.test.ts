import { describe, it, expect } from 'vitest'
import {
    clampTocWidth,
    parseStoredTocWidth,
    TOC_MIN_WIDTH,
    TOC_MAX_WIDTH,
    TOC_DEFAULT_WIDTH,
} from './tocLayout'

describe('clampTocWidth', () => {
    it('passes an in-range width through (rounded)', () => {
        expect(clampTocWidth(140.4)).toBe(140)
        expect(clampTocWidth(200)).toBe(200)
    })

    it('clamps to the min and max bounds', () => {
        expect(clampTocWidth(10)).toBe(TOC_MIN_WIDTH)
        expect(clampTocWidth(999)).toBe(TOC_MAX_WIDTH)
    })
})

describe('parseStoredTocWidth', () => {
    it('returns a valid in-range stored width', () => {
        expect(parseStoredTocWidth('150')).toBe(150)
    })

    it('accepts the full drag range the handler can produce', () => {
        // Regression: the reader used to reject 85-89, silently resetting a width
        // the drag handler was allowed to set. Both ends must now round-trip.
        expect(parseStoredTocWidth(String(TOC_MIN_WIDTH))).toBe(TOC_MIN_WIDTH)
        expect(parseStoredTocWidth(String(TOC_MAX_WIDTH))).toBe(TOC_MAX_WIDTH)
    })

    it('returns null for missing, unparseable, or out-of-range values', () => {
        expect(parseStoredTocWidth(null)).toBeNull()
        expect(parseStoredTocWidth('')).toBeNull()
        expect(parseStoredTocWidth('abc')).toBeNull()
        expect(parseStoredTocWidth('40')).toBeNull()
        expect(parseStoredTocWidth('500')).toBeNull()
    })

    it('keeps the default within the accepted range', () => {
        expect(parseStoredTocWidth(String(TOC_DEFAULT_WIDTH))).toBe(TOC_DEFAULT_WIDTH)
    })
})
