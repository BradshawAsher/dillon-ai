import { afterEach, describe, expect, it, vi } from 'vitest'
import { Upload, type UploadOptions } from 'tus-js-client'
import { RESUMABLE_CHUNK_BYTES, signedResumableOptions, uploadResumable } from './resumableUpload'

vi.mock('tus-js-client', () => ({ Upload: vi.fn() }))
const ticket = { resumableUrl: 'https://p.storage.supabase.co/storage/v1/upload/resumable/sign', token: 'scoped-secret', bucket: 'deal-documents', path: 'project/file.pdf' }
afterEach(() => { vi.useRealTimers(); vi.resetAllMocks() })

describe('signed resumable uploads', () => {
    it('uses signed direct-storage chunks without API credentials or persistent cross-project resume URLs', () => {
        expect(signedResumableOptions(ticket, 'application/pdf')).toMatchObject({ endpoint: ticket.resumableUrl, headers: { 'x-signature': ticket.token }, chunkSize: 6 * 1024 * 1024, storeFingerprintForResuming: false, metadata: { objectName: 'project/file.pdf', bucketName: 'deal-documents' } })
    })
    it('reads only one chunk at a time from an 18 MiB file and resolves on confirmed success', async () => {
        const file = new File([new Uint8Array(18 * 1024 * 1024)], 'large.pdf')
        const wholeFileRead = vi.spyOn(file, 'arrayBuffer')
        let options!: UploadOptions
        vi.mocked(Upload).mockImplementation(function (_file, config) { options = config; return { start: vi.fn(), abort: vi.fn() } as unknown as Upload })
        const progress = vi.fn()
        const promise = uploadResumable(file, ticket, 'application/pdf', progress)
        const source = await options.fileReader!.openFile(file, RESUMABLE_CHUNK_BYTES)
        expect((await source.slice(0, RESUMABLE_CHUNK_BYTES)).value.size).toBe(RESUMABLE_CHUNK_BYTES)
        expect(wholeFileRead).not.toHaveBeenCalled()
        options.onProgress!(RESUMABLE_CHUNK_BYTES, file.size)
        expect(progress).toHaveBeenCalledWith(33)
        options.onSuccess!({} as any)
        await expect(promise).resolves.toBeUndefined()
    })
    it('redacts signed URLs from network errors', async () => {
        vi.mocked(Upload).mockImplementation(function (_file, options) { return { start: () => options.onError!(new Error('fetch failed https://storage/upload?token=scoped-secret')), abort: vi.fn() } as unknown as Upload })
        await expect(uploadResumable(new Blob(['x']), ticket, '')).rejects.toThrow('could not reach storage')
        await uploadResumable(new Blob(['x']), ticket, '').catch(error => expect(error.message).not.toContain(ticket.token))
    })
    it('reports unreadable local files instead of blaming the network', async () => {
        const file = new File(['local file'], 'local.pdf')
        vi.spyOn(file, 'slice').mockReturnValue({ arrayBuffer: async () => { throw new DOMException('File changed', 'NotReadableError') } } as Blob)
        let options!: UploadOptions
        vi.mocked(Upload).mockImplementation(function (_file, config) { options = config; return { start: vi.fn(), abort: vi.fn() } as unknown as Upload })
        const promise = uploadResumable(file, ticket, '')
        const source = await options.fileReader!.openFile(file, RESUMABLE_CHUNK_BYTES)
        await source.slice(0, 10).catch(error => options.onError!(error))
        await expect(promise).rejects.toThrow('selected file cannot be read')
    })
    it('aborts an upload that never responds', async () => {
        vi.useFakeTimers()
        const abort = vi.fn().mockResolvedValue(undefined)
        vi.mocked(Upload).mockImplementation(function () { return { start: vi.fn(), abort } as unknown as Upload })
        const assertion = expect(uploadResumable(new Blob(['x']), ticket, '')).rejects.toThrow('timed out')
        await vi.advanceTimersByTimeAsync(180_000)
        await assertion
        expect(abort).toHaveBeenCalledOnce()
    })
})
