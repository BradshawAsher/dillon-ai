type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'mergeworks.theme'

export function getStoredTheme(): Theme {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY)
        if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    } catch {}
    return 'system'
}

export function setStoredTheme(theme: Theme) {
    try { window.localStorage.setItem(STORAGE_KEY, theme) } catch {}
    applyTheme(theme)
}

export function applyTheme(theme: Theme) {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
}

export function initTheme() {
    applyTheme(getStoredTheme())
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (getStoredTheme() === 'system') applyTheme('system')
    })
}
