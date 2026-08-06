import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getIdentity, identityHeaders, setIdentity } from './identity'

class MemoryStorage {
    private store = new Map<string, string>()
    getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null }
    setItem(k: string, v: string) { this.store.set(k, v) }
    removeItem(k: string) { this.store.delete(k) }
    clear() { this.store.clear() }
}

const KEY = 'dueDiligenceDashboard.analystIdentity'

beforeEach(() => {
    Object.defineProperty(globalThis, 'window', { value: { localStorage: new MemoryStorage() }, configurable: true })
})

afterEach(() => {
    // @ts-expect-error cleanup
    delete globalThis.window
})

describe('identity storage', () => {
    it('returns null when nothing is stored', () => {
        expect(getIdentity()).toBeNull()
    })

    it('round-trips a valid identity', () => {
        setIdentity({ name: 'Ada Lovelace', email: 'ada@example.com' })
        expect(getIdentity()).toEqual({ name: 'Ada Lovelace', email: 'ada@example.com' })
    })

    it('rejects a partial or blank identity as signed-out', () => {
        window.localStorage.setItem(KEY, JSON.stringify({ name: 'No Email' }))
        expect(getIdentity()).toBeNull()
        window.localStorage.setItem(KEY, JSON.stringify({ name: '  ', email: '  ' }))
        expect(getIdentity()).toBeNull()
    })

    it('treats corrupted JSON as signed-out instead of throwing', () => {
        window.localStorage.setItem(KEY, '{broken')
        expect(getIdentity()).toBeNull()
    })
})

describe('identityHeaders', () => {
    it('is empty when signed out', () => {
        expect(identityHeaders()).toEqual({})
    })

    it('URL-encodes name and email so header values stay valid', () => {
        setIdentity({ name: 'José DÃ­az', email: 'jose+deals@example.com' })
        const headers = identityHeaders()
        expect(headers['x-analyst-name']).toBe(encodeURIComponent('José DÃ­az'))
        expect(headers['x-analyst-email']).toBe(encodeURIComponent('jose+deals@example.com'))
    })
})
