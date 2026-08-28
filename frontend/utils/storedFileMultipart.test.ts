import { afterEach, describe, expect, it, vi } from 'vitest'
import { storedFileMultipart, validateDocumentStorageUrl } from '../../backend/diligence/storedFileMultipart'

afterEach(() => vi.unstubAllGlobals())
const storageUrl = 'https://dillon-ai-worker.bradshin231.workers.dev/p/doc.pdf'

describe('storage-to-n8n multipart streaming', () => {
    it('streams a full 18 MB file as a valid attachment, without arrayBuffer/base64 copies', async () => {
        const size = 18 * 1024 * 1024
        let remaining = size
        const source = new Response(new ReadableStream({ pull(controller) {
            if (!remaining) return controller.close()
            const chunk = new Uint8Array(Math.min(64 * 1024, remaining)).fill(65)
            remaining -= chunk.length
            controller.enqueue(chunk)
        } }))
        const bufferSpy = vi.spyOn(source, 'arrayBuffer')
        const fetchMock = vi.fn().mockResolvedValue(source)
        vi.stubGlobal('fetch', fetchMock)
        const multipart = await storedFileMultipart([{ key: 'projectId', value: 'p' }, { key: 'file', fileUrl: storageUrl, filename: 'large.pdf', contentType: 'application/pdf', fileSize: size }], new AbortController().signal)
        try {
            expect(remaining).toBe(0)
            const request = new Request('https://n8n.example/upload', { method: 'POST', body: multipart.body })
            const form = await request.formData()
            expect(form.get('projectId')).toBe('p')
            expect((form.get('file') as File).size).toBe(size)
            expect((form.get('file') as File).name).toBe('large.pdf')
            expect(bufferSpy).not.toHaveBeenCalled()
            expect(fetchMock).toHaveBeenCalledWith(storageUrl, expect.objectContaining({ redirect: 'error' }))
        } finally {
            await multipart.cleanup()
            await multipart.cleanup()
        }
    })
    it('rejects failed or truncated storage downloads instead of forwarding an empty document', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad', { status: 404 })))
        const get = () => storedFileMultipart([{ key: 'file', fileUrl: storageUrl, fileSize: 5 }], new AbortController().signal)
        await expect(get()).rejects.toThrow('HTTP 404')
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('abc')))
        await expect(get()).rejects.toThrow('incomplete')
    })
    it('rejects arbitrary URLs and embedded credentials', () => {
        expect(() => validateDocumentStorageUrl('http://127.0.0.1/private')).toThrow()
        expect(() => validateDocumentStorageUrl('https://example.com/file.pdf')).toThrow()
        expect(() => validateDocumentStorageUrl('https://user:password@dillon-ai-worker.bradshin231.workers.dev/p/file')).toThrow()
    })
})
