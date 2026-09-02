import { describe, expect, it } from 'vitest'

import { formatBreakevenValue } from './breakevenFormat'

describe('formatBreakevenValue', () => {
    it('formats multiples with two decimals and an x suffix', () => {
        expect(formatBreakevenValue(1.5, 'x')).toBe('1.50x')
        expect(formatBreakevenValue(2, 'x')).toBe('2.00x')
    })

    it('formats dollar amounts as rounded, comma-grouped values', () => {
        expect(formatBreakevenValue(1_234_567, '$')).toBe('$1,234,567')
        expect(formatBreakevenValue(999.6, '$')).toBe('$1,000')
    })

    it('guards non-finite values with a dash placeholder', () => {
        expect(formatBreakevenValue(Infinity, '$')).toBe('—')
        expect(formatBreakevenValue(NaN, 'x')).toBe('—x')
    })
})
