import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getStoredTheme, setStoredTheme, applyTheme, initTheme } from './darkMode'

class MemoryStorage {
    private store = new Map<string, string>()
    getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null }
    setItem(k: string, v: string) { this.store.set(k, v) }
    removeItem(k: string) { this.store.delete(k) }
    clear() { this.store.clear() }
}

let darkClass = false
let prefersDark = false
let mediaListenerCount = 0

beforeEach(() => {
    darkClass = false
    prefersDark = false
    mediaListenerCount = 0
    Object.defineProperty(globalThis, 'window', {
        value: {
            localStorage: new MemoryStorage(),
            matchMedia: () => ({ matches: prefersDark, addEventListener() { mediaListenerCount += 1 } }),
        },
        configurable: true,
    })
    Object.defineProperty(globalThis, 'document', {
        value: {
            documentElement: {
                classList: {
                    toggle: (_cls: string, force: boolean) => { darkClass = force },
                },
            },
        },
        configurable: true,
    })
})

afterEach(() => {
    // @ts-expect-error test cleanup
    delete globalThis.window
    // @ts-expect-error test cleanup
    delete globalThis.document
})

describe('getStoredTheme', () => {
    it('defaults to light when nothing valid is stored', () => {
        expect(getStoredTheme()).toBe('light')
        window.localStorage.setItem('mergeworks.theme', 'purple')
        expect(getStoredTheme()).toBe('light')
    })

    it('returns a stored valid theme', () => {
        window.localStorage.setItem('mergeworks.theme', 'dark')
        expect(getStoredTheme()).toBe('dark')
        window.localStorage.setItem('mergeworks.theme', 'system')
        expect(getStoredTheme()).toBe('system')
    })
})

describe('setStoredTheme', () => {
    it('persists the theme and applies the dark class', () => {
        setStoredTheme('dark')
        expect(window.localStorage.getItem('mergeworks.theme')).toBe('dark')
        expect(darkClass).toBe(true)
    })
})

describe('applyTheme', () => {
    it('enables the dark class for the dark theme', () => {
        applyTheme('dark')
        expect(darkClass).toBe(true)
    })

    it('disables the dark class for the light theme', () => {
        applyTheme('light')
        expect(darkClass).toBe(false)
    })

    it('follows the OS preference for the system theme', () => {
        prefersDark = true
        applyTheme('system')
        expect(darkClass).toBe(true)
        prefersDark = false
        applyTheme('system')
        expect(darkClass).toBe(false)
    })
})

describe('initTheme', () => {
    it('attaches the OS-preference listener only once across repeated calls', () => {
        initTheme()
        initTheme()
        initTheme()
        expect(mediaListenerCount).toBe(1)
    })
})
