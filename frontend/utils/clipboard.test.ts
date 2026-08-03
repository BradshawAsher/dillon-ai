import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyToClipboard } from './clipboard'

const originalNavigator = globalThis.navigator
const originalDocument = globalThis.document

afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, 'navigator', { value: originalNavigator, configurable: true })
    Object.defineProperty(globalThis, 'document', { value: originalDocument, configurable: true })
})

describe('copyToClipboard', () => {
    it('uses the async Clipboard API when available', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined)
        Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText } }, configurable: true })

        await expect(copyToClipboard('hello')).resolves.toBe(true)
        expect(writeText).toHaveBeenCalledWith('hello')
    })

    it('falls back to execCommand when the Clipboard API throws', async () => {
        const writeText = vi.fn().mockRejectedValue(new Error('denied'))
        Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText } }, configurable: true })

        const execCommand = vi.fn().mockReturnValue(true)
        const textarea = { value: '', style: {}, setAttribute: vi.fn(), select: vi.fn() }
        Object.defineProperty(globalThis, 'document', {
            value: {
                createElement: vi.fn().mockReturnValue(textarea),
                execCommand,
                body: { appendChild: vi.fn(), removeChild: vi.fn() },
            },
            configurable: true,
        })

        await expect(copyToClipboard('data')).resolves.toBe(true)
        expect(execCommand).toHaveBeenCalledWith('copy')
        expect(textarea.value).toBe('data')
    })

    it('returns false when neither clipboard nor document is available', async () => {
        Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true })
        Object.defineProperty(globalThis, 'document', { value: undefined, configurable: true })

        await expect(copyToClipboard('x')).resolves.toBe(false)
    })
})
