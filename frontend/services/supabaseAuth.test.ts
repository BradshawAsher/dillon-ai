import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { saveAppAuth, AUTH_CHANGE_EVENT } from './supabaseAuth'

// A localStorage whose writes throw, to simulate private mode / quota-exceeded.
class ThrowingStorage {
    getItem() { return null }
    setItem() { throw new DOMException('QuotaExceededError') }
    removeItem() { throw new DOMException('QuotaExceededError') }
    key() { return null }
    clear() {}
    get length() { return 0 }
}

describe('saveAppAuth storage resilience', () => {
    let previousWindow: PropertyDescriptor | undefined
    let previousStorage: PropertyDescriptor | undefined

    beforeEach(() => {
        previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
        previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
        Object.defineProperty(globalThis, 'window', { value: new EventTarget(), configurable: true })
        Object.defineProperty(globalThis, 'localStorage', { value: new ThrowingStorage(), configurable: true })
    })

    afterEach(() => {
        if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
        else delete (globalThis as Record<string, unknown>).window
        if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
        else delete (globalThis as Record<string, unknown>).localStorage
    })

    it('does not throw and still dispatches the auth-change event when storage fails', () => {
        let received: unknown = null
        ;(globalThis.window as EventTarget).addEventListener(AUTH_CHANGE_EVENT, (event) => {
            received = (event as CustomEvent).detail
        })

        expect(() => saveAppAuth({ email: 'x@y.com', name: 'X', role: 'tester' } as never)).not.toThrow()
        expect(received).toMatchObject({ user: { email: 'x@y.com' } })

        expect(() => saveAppAuth(null)).not.toThrow()
    })
})
