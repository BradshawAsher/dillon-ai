type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'mergeworks.theme'

export function getStoredTheme(): Theme {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY)
        if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    } catch {}
    return 'light'
}

export function setStoredTheme(theme: Theme) {
    try { window.localStorage.setItem(STORAGE_KEY, theme) } catch {}
    applyTheme(theme)
}

export function applyTheme(theme: Theme) {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
}

// Ensures the OS-preference listener is only ever attached once. initTheme can
// run more than once (React StrictMode double-invoke, HMR, remounts); without
// this guard each call stacks another anonymous listener that can never be
// removed, leaking handlers that all do the same work.
let mediaListenerAttached = false

export function initTheme() {
    applyTheme(getStoredTheme())
    if (mediaListenerAttached || typeof window === 'undefined' || !window.matchMedia) return
    mediaListenerAttached = true
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (getStoredTheme() === 'system') applyTheme('system')
    })
}
