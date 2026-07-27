import { describe, expect, it } from 'vitest'

import { fileSafeName } from './downloadFile'

describe('fileSafeName', () => {
    it('lowercases and hyphenates whitespace and punctuation', () => {
        expect(fileSafeName('Northwind Analytics — Deal Memo')).toBe('northwind-analytics-deal-memo')
    })

    it('collapses runs of separators into a single hyphen', () => {
        expect(fileSafeName('a___b   c')).toBe('a-b-c')
    })

    it('trims leading and trailing separators', () => {
        expect(fileSafeName('  -Hello!-  ')).toBe('hello')
    })

    it('falls back to "report" when nothing usable remains', () => {
        expect(fileSafeName('')).toBe('report')
        expect(fileSafeName('***')).toBe('report')
    })
})
