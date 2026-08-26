import { describe, expect, it } from 'vitest'

import { fileExtension } from './zipExtractor'

describe('fileExtension', () => {
    it('returns the lower-cased extension of the final path segment', () => {
        expect(fileExtension('folder/Report.PDF')).toBe('.pdf')
        expect(fileExtension('a/b/statement.xlsx')).toBe('.xlsx')
        expect(fileExtension('note.txt')).toBe('.txt')
    })

    it('returns empty for a dotless base name instead of its last character', () => {
        expect(fileExtension('Makefile')).toBe('')
        expect(fileExtension('archive/ledger')).toBe('')
    })

    it('does not pick up a dot from a parent folder', () => {
        expect(fileExtension('v1.2/ledger')).toBe('')
        expect(fileExtension('release.2024/summary.csv')).toBe('.csv')
    })

    it('treats a leading-dot dotfile as having no extension', () => {
        expect(fileExtension('.DS_Store')).toBe('')
        expect(fileExtension('folder/._resource')).toBe('')
    })

    it('normalizes backslash separators', () => {
        expect(fileExtension('folder\\deep\\deck.pptx')).toBe('.pptx')
    })
})
