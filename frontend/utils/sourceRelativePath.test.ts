import { describe, expect, it } from 'vitest'
import { normalizeSourceRelativePath, sourceRelativePathForFile } from '../../shared/sourceRelativePath'

describe('source-relative paths', () => {
    it('preserves normalized nested folder context', () => {
        expect(normalizeSourceRelativePath('Target\\01 Financials\\2025\\P&L.xlsx', 'P&L.xlsx'))
            .toBe('Target/01 Financials/2025/P&L.xlsx')
    })

    it('uses a safe basename for absolute and traversing paths', () => {
        expect(normalizeSourceRelativePath('C:\\Users\\person\\secret.pdf', 'secret.pdf')).toBe('secret.pdf')
        expect(normalizeSourceRelativePath('../outside/secret.pdf', 'secret.pdf')).toBe('secret.pdf')
    })

    it('falls back to the ordinary file name when no directory was selected', () => {
        expect(sourceRelativePathForFile({ name: 'standalone.pdf', webkitRelativePath: '' })).toBe('standalone.pdf')
    })
})
