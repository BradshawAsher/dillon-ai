import { afterEach, describe, expect, it, vi } from 'vitest'
import { prepareDocumentUpload, MAX_INLINE_DOCUMENT_BYTES } from './documentUpload'
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
})
