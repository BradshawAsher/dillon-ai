import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
    getEffectiveModelPipeline,
    getActiveProviders,
    hasAnySavedApiKey,
    getUserModelConfig,
    saveApiKey,
    DEFAULT_MODEL_CONFIGS,
} from '../components/ApiKeyModal'

class ThrowingStorage {
    getItem(): string | null { throw new DOMException('SecurityError') }
    setItem(): void { throw new DOMException('QuotaExceededError') }
    removeItem(): void { throw new DOMException('QuotaExceededError') }
    key() { return null }
    clear() {}
    get length() { return 0 }
}

describe('ApiKeyModal storage resilience', () => {
    let previousWindow: PropertyDescriptor | undefined
    let previousStorage: PropertyDescriptor | undefined

    beforeEach(() => {
        previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
        previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
        Object.defineProperty(globalThis, 'window', { value: {}, configurable: true })
        Object.defineProperty(globalThis, 'localStorage', { value: new ThrowingStorage(), configurable: true })
    })

    afterEach(() => {
        if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
        else delete (globalThis as Record<string, unknown>).window
        if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
        else delete (globalThis as Record<string, unknown>).localStorage
    })

    it('falls back to defaults instead of throwing when storage is blocked', () => {
        expect(() => getEffectiveModelPipeline()).not.toThrow()
        expect(getEffectiveModelPipeline().activeProvider).toBe('default')
        expect(getActiveProviders()).toEqual([])
        expect(hasAnySavedApiKey()).toBe(false)
        expect(getUserModelConfig('openai')).toEqual(DEFAULT_MODEL_CONFIGS.openai)
        expect(() => saveApiKey('sk-test')).not.toThrow()
    })
})
