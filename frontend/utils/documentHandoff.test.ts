import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { mkdtemp, stat } from 'node:fs/promises'
import { MAX_HANDOFF_BYTES, storedFileMultipart } from '../../backend/diligence/storedFileMultipart'
import { fetchWithDocumentHandoff } from '../../backend/diligence/documentHandoff'
import { installBackendGlobals as installApiRuntime } from '../../api/_lib/nodeRuntime'
import { installBackendGlobals as installDevRuntime } from '../nodeRuntime'

vi.mock('node:fs/promises', async (original) => {
    const fs = await original<typeof import('node:fs/promises')>()
    return { ...fs, mkdtemp: vi.fn(fs.mkdtemp) }
})

const nativeFetch = globalThis.fetch
const storageUrl = 'https://dillon-ai-worker.bradshin231.workers.dev/p/doc.pdf'
const entries = [{ key: 'projectId', value: 'p' }, { key: 'file', fileUrl: storageUrl, filename: 'large.pdf', contentType: 'application/pdf', fileSize: 3 }]
function sourceOfSize(size: number) {
    let remaining = size
    return new Response(new ReadableStream({ pull(controller) {
        if (!remaining) return controller.close()
        const chunk = new Uint8Array(Math.min(64 * 1024, remaining)).fill(65)
        remaining -= chunk.length
        controller.enqueue(chunk)
    } }))
}
beforeEach(() => {
    vi.mocked(mkdtemp).mockClear()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(async () => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    // Real filesystem check, including rejection and lost-acknowledgment paths.
    for (const result of vi.mocked(mkdtemp).mock.results) {
        if (result.type === 'return') await expect(stat(await result.value)).rejects.toMatchObject({ code: 'ENOENT' })
    }
})

describe('verified document handoff', () => {
    it('sends a real 18.7 MB multipart HTTP request with Content-Length and complete bytes', async () => {
        const size = 18_747_545
        let received = 0
        let contentLength = ''
        let transferEncoding: string | string[] | undefined
        let payload: FormData | undefined
        const server = createServer(async (req, res) => {
            contentLength = String(req.headers['content-length'])
            transferEncoding = req.headers['transfer-encoding']
            const chunks: Buffer[] = []
            for await (const chunk of req) { received += chunk.length; chunks.push(chunk) }
            payload = await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': req.headers['content-type']! } }).formData()
            res.end('{"ok":true}')
        })
        server.listen(0, '127.0.0.1')
        await once(server, 'listening')
        const port = (server.address() as { port: number }).port
        vi.stubGlobal('fetch', vi.fn((url, init) => url === storageUrl ? Promise.resolve(sourceOfSize(size)) : nativeFetch(url, init)))
        try {
            const result = await fetchWithDocumentHandoff(`http://127.0.0.1:${port}`, { method: 'POST', headers: { 'Content-Type': 'stale-boundary', 'Content-Length': '1' } }, [{ ...entries[0] }, { ...entries[1], fileSize: size }])
            expect(result.text).toBe('{"ok":true}')
            expect(Number(contentLength)).toBe(received)
            expect(received).toBeGreaterThan(size)
            expect(transferEncoding).toBeUndefined()
            expect(payload!.get('projectId')).toBe('p')
            const file = payload!.get('file') as File
            expect(file.name).toBe('large.pdf')
            expect(file.size).toBe(size)
            expect(Buffer.from(await file.arrayBuffer()).every(byte => byte === 65)).toBe(true)
        } finally {
            server.closeAllConnections()
            await new Promise<void>(resolve => server.close(() => resolve()))
        }
    })

    it.each([
        ['HTTP error', () => new Response('bad', { status: 404 }), 'HTTP 404'],
        ['truncated', () => new Response('ab'), 'incomplete'],
        ['oversized', () => new Response('abcd'), 'does not match'],
        ['source disconnect', () => new Response(new ReadableStream({ start(c) { c.error(new Error('other side closed')) } })), 'storage download'],
    ])('does not open n8n when storage fails: %s', async (_name, source, expected) => {
        const fetchMock = vi.fn().mockResolvedValue(source())
        vi.stubGlobal('fetch', fetchMock)
        await expect(fetchWithDocumentHandoff('https://n8n.example/upload', { method: 'POST' }, entries)).rejects.toThrow(expected)
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(fetchMock.mock.calls[0][0]).toBe(storageUrl)
    })

    it('rejects invalid sizes before fetching, and accepts bounded downloads with no size metadata', async () => {
        vi.stubGlobal('fetch', vi.fn())
        for (const fileSize of [NaN, -1, MAX_HANDOFF_BYTES + 1]) {
            await expect(storedFileMultipart([{ ...entries[1], fileSize }], new AbortController().signal)).rejects.toThrow('size is invalid')
        }
        expect(fetch).not.toHaveBeenCalled()
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('abc')))
        const result = await storedFileMultipart([{ ...entries[1], fileSize: undefined }], new AbortController().signal)
        expect((result.body.get('file') as File).size).toBe(3)
        await result.cleanup()
    })

    it('cancels a stalled download and cleans up without contacting n8n', async () => {
        const controller = new AbortController()
        const source = new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1])) } }))
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(source))
        const result = storedFileMultipart(entries, controller.signal)
        const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' })
        setTimeout(() => controller.abort(), 20)
        await rejected
        expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('does not retry automatically after a socket disconnect', async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(new Response('abc')).mockRejectedValueOnce(new TypeError('fetch failed', { cause: new Error('other side closed') }))
        vi.stubGlobal('fetch', fetchMock)
        await expect(fetchWithDocumentHandoff('https://n8n.example/upload', { method: 'POST' }, entries)).rejects.toThrow('while sending the document to n8n. The uploaded file remains in storage.')
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('cleans temporary files when the remote peer closes a real upload early', async () => {
        const server = createServer(req => { req.once('data', () => req.socket.destroy()) })
        server.listen(0, '127.0.0.1')
        await once(server, 'listening')
        const port = (server.address() as { port: number }).port
        vi.stubGlobal('fetch', vi.fn((url, init) => url === storageUrl ? Promise.resolve(sourceOfSize(18_747_545)) : nativeFetch(url, init)))
        try {
            await expect(fetchWithDocumentHandoff(`http://127.0.0.1:${port}`, { method: 'POST' }, [{ ...entries[1], fileSize: 18_747_545 }])).rejects.toThrow('while sending the document')
        } finally {
            server.closeAllConnections()
            await new Promise<void>(resolve => server.close(() => resolve()))
        }
    })

    it('keeps the timeout active until the acknowledgment body is read', async () => {
        vi.useFakeTimers()
        vi.stubGlobal('fetch', vi.fn(async (_url, init: RequestInit) => ({
            text: () => new Promise((_resolve, reject) => {
                init.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
            }),
        })))
        const result = fetchWithDocumentHandoff('https://n8n.example/upload', { method: 'POST' })
        const rejected = expect(result).rejects.toThrow('not confirmed within 3 minutes')
        await vi.advanceTimersByTimeAsync(180_000)
        await rejected
        expect(console.warn).toHaveBeenCalledWith('Document handoff interrupted', { stage: 'n8n-response', timedOut: true })
    })

    it('distinguishes an acknowledgment disconnect from a source download failure', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('abc')).mockResolvedValueOnce({ text: () => Promise.reject(new Error('closed')) }))
        await expect(fetchWithDocumentHandoff('https://n8n.example/upload', { method: 'POST' }, entries)).rejects.toThrow('while reading the workflow acknowledgment')
    })

    it.each([['deployed API', installApiRuntime], ['local server', installDevRuntime]])('uses verified multipart in the %s runtime', async (_name, install) => {
        vi.stubGlobal('n8nFinancialAgent', undefined)
        vi.stubGlobal('retoolDb', undefined)
        let attachmentSize = 0
        const fetchMock = vi.fn().mockResolvedValueOnce(new Response('abc')).mockImplementationOnce(async (_url, init: RequestInit) => {
            attachmentSize = ((init.body as FormData).get('file') as File).size
            return new Response('{"ok":true,"requestID":"r"}')
        })
        vi.stubGlobal('fetch', fetchMock)
        install()
        await expect(n8nFinancialAgent.rawRequest({ path: 'webhook/submit', method: 'POST', bodyType: 'form-data', formData: entries })).resolves.toEqual({ data: { ok: true, requestID: 'r' } })
        expect(attachmentSize).toBe(3)
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })
})
