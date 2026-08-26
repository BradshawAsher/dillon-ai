import { describe, expect, it } from 'vitest'

import { isDynamicImportError } from './lazyWithRetry'

describe('isDynamicImportError', () => {
    it('recognizes the Chromium/Vite and Firefox chunk failures', () => {
        expect(isDynamicImportError(new Error('Failed to fetch dynamically imported module: /assets/x.js'))).toBe(true)
        expect(isDynamicImportError(new Error('Loading chunk 42 failed'))).toBe(true)
        expect(isDynamicImportError(new Error('error loading dynamically imported module'))).toBe(true)
    })

    it('recognizes the Safari phrasing that was previously missed', () => {
        expect(isDynamicImportError(new Error('Importing a module script failed.'))).toBe(true)
    })

    it('is case-insensitive and tolerates non-Error inputs', () => {
        expect(isDynamicImportError('FAILED TO FETCH')).toBe(true)
        expect(isDynamicImportError({ message: 'Loading Chunk 3 Failed' })).toBe(true)
    })

    it('does not match unrelated errors', () => {
        expect(isDynamicImportError(new Error('TypeError: x is not a function'))).toBe(false)
        expect(isDynamicImportError(null)).toBe(false)
        expect(isDynamicImportError(undefined)).toBe(false)
    })
})
