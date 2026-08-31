import { afterEach, describe, expect, it, vi } from 'vitest'
import { prepareDocumentUpload, prepareDocumentUploadWithRetry, MAX_INLINE_DOCUMENT_BYTES } from './documentUpload'
import { uploadDocumentToSupabaseStorage } from './supabaseStorage'

vi.mock('./supabaseStorage', () => ({ uploadDocumentToSupabaseStorage: vi.fn() }))
afterEach(() => vi.resetAllMocks())

describe('document upload payloads', () => {
    it('uploads an 18 MB document directly and sends metadata only to the app API', async () => {
        const file = new File([new Uint8Array(18 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })
        vi.mocked(uploadDocumentToSupabaseStorage).mockResolvedValue({ storageFileUrl: 'https://storage/large.pdf', storagePath: 'p/large.pdf', fileName: file.name, fileSize: file.size })
        const read = vi.fn()
        const payload = await prepareDocumentUpload(file, 'p', read)
        expect(read).not.toHaveBeenCalled()
        expect(payload.fileBase64).toBe('')
        expect(JSON.stringify(payload).length).toBeLessThan(1024)
        expect(uploadDocumentToSupabaseStorage).toHaveBeenCalledWith({ file, projectId: 'p' })
    })
    it('never silently falls back to a large base64 API request', async () => {
        const file = new File([new Uint8Array(MAX_INLINE_DOCUMENT_BYTES + 1)], 'large.pdf')
        vi.mocked(uploadDocumentToSupabaseStorage).mockRejectedValue(new Error('R2 HTTP 503; Supabase HTTP 413'))
        const read = vi.fn()
        await expect(prepareDocumentUpload(file, 'p', read)).rejects.toThrow('R2 HTTP 503; Supabase HTTP 413')
        expect(read).not.toHaveBeenCalled()
    })
    it('retains the bounded inline fallback for small files when storage is unavailable', async () => {
        const file = new File(['pdf'], 'small.pdf')
        vi.mocked(uploadDocumentToSupabaseStorage).mockRejectedValue(new Error('offline'))
        const payload = await prepareDocumentUpload(file, 'p', vi.fn().mockResolvedValue('cGRm'))
        expect(payload).toEqual({ fileBase64: 'cGRm', storageFileUrl: '', storagePath: '' })
    })
    it('retries storage preparation without dispatching downstream work', async () => {
        const file = new File([new Uint8Array(MAX_INLINE_DOCUMENT_BYTES + 1)], 'large.pdf')
        vi.mocked(uploadDocumentToSupabaseStorage)
            .mockRejectedValueOnce(new Error('temporary R2 failure'))
            .mockResolvedValueOnce({ storageFileUrl: 'https://storage/large.pdf', storagePath: 'p/large.pdf', fileName: file.name, fileSize: file.size })
        const sleep = vi.fn().mockResolvedValue(undefined)

        const payload = await prepareDocumentUploadWithRetry(file, 'p', vi.fn(), { sleep })

        expect(payload.storageFileUrl).toBe('https://storage/large.pdf')
        expect(uploadDocumentToSupabaseStorage).toHaveBeenCalledTimes(2)
        expect(sleep).toHaveBeenCalledWith(1500)
    })
    it('surfaces the last storage error after bounded preparation attempts', async () => {
        const file = new File([new Uint8Array(MAX_INLINE_DOCUMENT_BYTES + 1)], 'large.pdf')
        vi.mocked(uploadDocumentToSupabaseStorage)
            .mockRejectedValueOnce(new Error('first failure'))
            .mockRejectedValueOnce(new Error('second failure'))

        await expect(prepareDocumentUploadWithRetry(file, 'p', vi.fn(), { sleep: vi.fn().mockResolvedValue(undefined) }))
            .rejects.toThrow('second failure')
        expect(uploadDocumentToSupabaseStorage).toHaveBeenCalledTimes(2)
    })
})
