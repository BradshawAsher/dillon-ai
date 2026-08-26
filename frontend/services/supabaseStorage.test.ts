import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requestSignedUploadUrl, uploadDocumentToSupabaseStorage } from './supabaseStorage'
import { supabaseAuthClient } from './supabaseAuth'

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
                status: 502,
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
        expect(onProgress).toHaveBeenCalledWith(100)
    })
})
