import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requestSignedUploadUrl, uploadDocumentToSupabaseStorage } from './supabaseStorage'
import { supabaseAuthClient } from './supabaseAuth'
import { uploadResumable } from './resumableUpload'

vi.mock('./resumableUpload', () => ({ RESUMABLE_CHUNK_BYTES: 6 * 1024 * 1024, uploadResumable: vi.fn() }))

describe('supabaseStorage service', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('requests signed upload URL via /api/diligence/upload-url', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                storageProvider: 'r2',
                uploadUrl: 'https://dillon-ai-worker.bradshin231.workers.dev/upload?path=project-1%2F12345-doc.pdf',
                signedUrl: 'https://supabase.co/storage/upload?token=xyz',
                path: 'project-1/12345-doc.pdf',
                token: 'xyz',
                publicUrl: 'https://pub-3b04d9f4c75546caae7c86bd7b6847de.r2.dev/project-1/12345-doc.pdf',
                bucket: 'dillon-deal-documents',
            }),
        })

        const res = await requestSignedUploadUrl({
            fileName: 'doc.pdf',
            fileType: 'application/pdf',
            fileSize: 1024,
            projectId: 'project-1',
        })

        expect(res.path).toBe('project-1/12345-doc.pdf')
        expect(res.publicUrl).toContain('project-1/12345-doc.pdf')
        expect(res.storageProvider).toBe('r2')
        expect(global.fetch).toHaveBeenCalledWith('/api/diligence/upload-url', expect.objectContaining({
            method: 'POST',
        }))
    })

    it('uploads file directly to Cloudflare R2 uploadUrl when available', async () => {
        const fetchMock = vi.fn()
            // 1. Ticket request
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    storageProvider: 'r2',
                    uploadUrl: 'https://dillon-ai-worker.bradshin231.workers.dev/upload?path=deal-documents%2Fdoc.pdf',
                    path: 'deal-documents/doc.pdf',
                    publicUrl: 'https://pub-3b04d9f4c75546caae7c86bd7b6847de.r2.dev/deal-documents/doc.pdf',
                    bucket: 'dillon-deal-documents',
                }),
            })
            // 2. Direct PUT upload to R2
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
            })
        global.fetch = fetchMock

        const mockBlob = new Blob(['mock binary contents'], { type: 'application/pdf' })
        const onProgress = vi.fn()

        const res = await uploadDocumentToSupabaseStorage({
            file: mockBlob,
            fileName: 'doc.pdf',
            fileType: 'application/pdf',
            projectId: 'deal-documents',
            onProgress,
        })

        expect(res.storageFileUrl).toBe('https://pub-3b04d9f4c75546caae7c86bd7b6847de.r2.dev/deal-documents/doc.pdf')
        expect(res.storagePath).toBe('deal-documents/doc.pdf')
        expect(onProgress).toHaveBeenCalledWith(100)
        expect(fetchMock).toHaveBeenCalledWith('https://dillon-ai-worker.bradshin231.workers.dev/upload?path=deal-documents%2Fdoc.pdf', expect.objectContaining({
            method: 'PUT',
        }))
    })

    it('gracefully falls back to Supabase Storage if R2 upload fails', async () => {
        const fetchMock = vi.fn()
            // 1. Ticket request
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    storageProvider: 'r2',
                    uploadUrl: 'https://dillon-ai-worker.bradshin231.workers.dev/upload?path=deal-documents%2Fdoc.pdf',
                    signedUrl: 'https://supabase.co/storage/upload?token=xyz',
                    path: 'deal-documents/doc.pdf',
                    token: 'xyz',
                    publicUrl: 'https://pub-3b04d9f4c75546caae7c86bd7b6847de.r2.dev/deal-documents/doc.pdf',
                    bucket: 'deal-documents',
                    supabaseFallback: {
                        signedUrl: 'https://supabase.co/storage/upload?token=xyz',
                        path: 'deal-documents/doc.pdf',
                        token: 'xyz',
                        publicUrl: 'https://sihpsqrunkwkxhhnwoqe.supabase.co/storage/v1/object/public/deal-documents/doc.pdf',
                        bucket: 'deal-documents',
                    },
                }),
            })
            // 2. R2 PUT fails
            .mockResolvedValueOnce({
                ok: false,
                status: 403,
            })
            // Non-retryable R2 error uses the signed Supabase upload directly.
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
            })
        global.fetch = fetchMock

        vi.spyOn(supabaseAuthClient.storage, 'from').mockReturnValue({
            uploadToSignedUrl: vi.fn().mockResolvedValue({
                data: { path: 'deal-documents/doc.pdf', fullPath: 'deal-documents/doc.pdf' },
                error: null,
            }),
        } as unknown as ReturnType<typeof supabaseAuthClient.storage.from>)

        const mockBlob = new Blob(['mock binary contents'], { type: 'application/pdf' })
        const onProgress = vi.fn()

        const res = await uploadDocumentToSupabaseStorage({
            file: mockBlob,
            fileName: 'doc.pdf',
            fileType: 'application/pdf',
            projectId: 'deal-documents',
            onProgress,
        })

        expect(res.storagePath).toBe('deal-documents/doc.pdf')
        expect(res.storageFileUrl).toContain('/storage/v1/object/public/deal-documents/doc.pdf')
        expect(onProgress).toHaveBeenCalledWith(100)
    })

    it('preserves both provider errors when the direct and fallback uploads fail', async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({ storageProvider: 'r2', uploadUrl: 'https://r2/upload', path: 'p/f.pdf', publicUrl: 'https://r2/f.pdf', supabaseFallback: { signedUrl: 'https://supabase/upload', path: 'p/f.pdf', publicUrl: 'https://supabase/f.pdf' } }) })
            .mockResolvedValueOnce({ ok: false, status: 403 })
            .mockResolvedValueOnce({ ok: false, status: 413 })
        await expect(uploadDocumentToSupabaseStorage({ file: new Blob(['doc']), fileName: 'f.pdf' })).rejects.toThrow('R2 HTTP 403; Supabase HTTP 413')
    })

    it('uses the actual fallback path when the signed ticket changes it', async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({ storageProvider: 'r2', uploadUrl: 'https://r2/upload', path: 'r2/f.pdf', publicUrl: 'https://r2/f.pdf', supabaseFallback: { signedUrl: 'https://supabase/upload', path: 'fallback/f.pdf', publicUrl: 'https://supabase/f.pdf' } }) })
            .mockResolvedValueOnce({ ok: false, status: 403 })
            .mockResolvedValueOnce({ ok: true, status: 200 })
        expect((await uploadDocumentToSupabaseStorage({ file: new Blob(['doc']), fileName: 'f.pdf' })).storagePath).toBe('fallback/f.pdf')
    })

    it('uploads an 18 MiB PDF directly to Cloudflare R2 when available', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    storageProvider: 'r2',
                    uploadUrl: 'https://worker/upload',
                    path: 'r2/deck.pdf',
                    publicUrl: 'https://pub-3b04d9f4c75546caae7c86bd7b6847de.r2.dev/r2/deck.pdf',
                }),
            })
            .mockResolvedValueOnce({ ok: true, status: 200 })
        global.fetch = fetchMock
        const file = new File([new Uint8Array(18 * 1024 * 1024)], 'deck.pdf', { type: 'application/pdf' })
        const result = await uploadDocumentToSupabaseStorage({ file })
        expect(result.storageFileUrl).toBe('https://pub-3b04d9f4c75546caae7c86bd7b6847de.r2.dev/r2/deck.pdf')
        expect(fetchMock).toHaveBeenCalledWith('https://worker/upload', expect.objectContaining({ method: 'PUT' }))
    })

    it('falls back to Supabase resumable storage for 18 MiB PDF if R2 upload fails', async () => {
        const fallback = { signedUrl: 'https://p.storage.supabase.co/signed', resumableUrl: 'https://p.storage.supabase.co/resumable', token: 'scoped', path: 'p/deck.pdf', publicUrl: 'https://sihpsqrunkwkxhhnwoqe.supabase.co/storage/v1/object/public/deal-documents/p/deck.pdf', bucket: 'deal-documents' }
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({ storageProvider: 'r2', uploadUrl: 'https://worker/upload', path: 'r2/deck.pdf', publicUrl: 'https://r2/deck.pdf', supabaseFallback: fallback }) })
            .mockResolvedValueOnce({ ok: false, status: 503 })
        vi.mocked(uploadResumable).mockResolvedValueOnce()
        const file = new File([new Uint8Array(18 * 1024 * 1024)], 'deck.pdf', { type: 'application/pdf' })
        const result = await uploadDocumentToSupabaseStorage({ file })
        expect(uploadResumable).toHaveBeenCalledWith(file, expect.objectContaining({ resumableUrl: fallback.resumableUrl, token: 'scoped' }), 'application/pdf', expect.any(Function))
        expect(result.storageFileUrl).toBe(fallback.publicUrl)
    })

    it('does not retry an identical full upload repeatedly after a network error', async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({ storageProvider: 'r2', uploadUrl: 'https://worker/upload', path: 'p/doc.pdf', publicUrl: 'https://r2/doc.pdf', supabaseFallback: { signedUrl: 'https://storage/signed', path: 'p/doc.pdf', publicUrl: 'https://storage/doc.pdf' } }) })
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockResolvedValueOnce({ ok: true, status: 200 })
        await expect(uploadDocumentToSupabaseStorage({ file: new Blob(['x']), fileName: 'doc.pdf' })).resolves.toMatchObject({ storageFileUrl: 'https://storage/doc.pdf' })
        expect(global.fetch).toHaveBeenCalledTimes(3)
    })
})
