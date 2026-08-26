import { describe, expect, it } from 'vitest'

import { fileSafeName, MAX_FILE_SAFE_NAME_LENGTH } from './downloadFile'

describe('fileSafeName', () => {
    it('lowercases and hyphenates whitespace and punctuation', () => {
        expect(fileSafeName('Northwind Analytics — Deal Memo')).toBe('northwind-analytics-deal-memo')
    })

    it('collapses runs of separators into a single hyphen', () => {
        expect(fileSafeName('a___b   c')).toBe('a-b-c')
    })

    it('folds accented letters to their ASCII base instead of dropping them', () => {
        expect(fileSafeName('Café Résumé')).toBe('cafe-resume')
        expect(fileSafeName('Zürich Söhne')).toBe('zurich-sohne')
    })

    it('trims leading and trailing separators', () => {
        expect(fileSafeName('  -Hello!-  ')).toBe('hello')
    })

    it('falls back to "report" when nothing usable remains', () => {
        expect(fileSafeName('')).toBe('report')
        expect(fileSafeName('***')).toBe('report')
    })

    it('caps very long names and trims a trailing hyphen left by the cut', () => {
        const result = fileSafeName('a'.repeat(80) + ' ' + 'b'.repeat(80))
        expect(result.length).toBeLessThanOrEqual(MAX_FILE_SAFE_NAME_LENGTH)
        expect(result.endsWith('-')).toBe(false)
    })
})
