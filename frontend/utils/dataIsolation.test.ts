import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { isDataIsolationEnabled, setDataIsolation, DATA_ISOLATION_EVENT } from '../components/AuthGate'

class ThrowingStorage {
    getItem() { throw new DOMException('SecurityError') }
    setItem() { throw new DOMException('QuotaExceededError') }
    removeItem() {}
    key() { return null }
    clear() {}
    get length() { return 0 }
}

describe('data isolation storage resilience', () => {
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

    it('reads as false instead of throwing when storage is blocked', () => {
        expect(() => isDataIsolationEnabled()).not.toThrow()
        expect(isDataIsolationEnabled()).toBe(false)
    })

    it('still dispatches the change event when the write fails', () => {
        let detail: unknown = null
        ;(globalThis.window as EventTarget).addEventListener(DATA_ISOLATION_EVENT, (event) => {
            detail = (event as CustomEvent).detail
        })
        expect(() => setDataIsolation(true)).not.toThrow()
        expect(detail).toEqual({ enabled: true })
    })
})
