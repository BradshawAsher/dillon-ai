import { describe, expect, it } from 'vitest'

import { base64ToFile } from './fileEncoding'

// btoa/atob and File exist in the vitest (jsdom/node) environment.
describe('base64ToFile', () => {
    it('reconstructs a file with the right name, type, and byte content', async () => {
        const original = 'hello world'
        const b64 = btoa(original)
        const file = base64ToFile(b64, 'greeting.txt', 'text/plain')
        expect(file.name).toBe('greeting.txt')
        expect(file.type).toBe('text/plain')
        expect(await file.text()).toBe(original)
    })

    it('tolerates a full data-URI prefix', async () => {
        const b64 = btoa('csv,data')
        const file = base64ToFile(`data:text/csv;base64,${b64}`, 'x.csv', 'text/csv')
        expect(await file.text()).toBe('csv,data')
    })

    it('produces an empty file for an empty payload', async () => {
        const file = base64ToFile('', 'empty.bin', 'application/octet-stream')
        expect(file.size).toBe(0)
    })
})
