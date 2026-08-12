// Robust clipboard copy shared across the workspace's many "copy" buttons.
//
// The async Clipboard API (navigator.clipboard) is only available in secure
// contexts. On plain-http hosts or older browsers `navigator.clipboard` is
// undefined, so a bare `navigator.clipboard.writeText(...)` throws a
// TypeError synchronously and the copy silently fails (often after the button
// has already flipped to a "Copied!" state). This helper tries the modern API,
// falls back to a hidden-textarea execCommand copy, and reports success so the
// caller can show accurate feedback.

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text)
            return true
        }
    } catch {
        // fall through to the legacy path below
    }

    if (typeof document === 'undefined') return false

    const previouslyFocused = document.activeElement as HTMLElement | null

    try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        // iOS Safari ignores select() on a readonly textarea; an explicit range
        // is what actually selects the text there.
        textarea.setSelectionRange?.(0, text.length)
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        // Restore focus to whatever the user was on so the copy doesn't steal it.
        previouslyFocused?.focus?.()
        return ok
    } catch {
        return false
    }
}
