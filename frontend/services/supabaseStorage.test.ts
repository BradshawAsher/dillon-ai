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
                signedUrl: 'https://supabase.co/storage/upload?token=xyz',
                path: 'project-1/12345-doc.pdf',
                token: 'xyz',
                publicUrl: 'https://supabase.co/storage/public/project-1/12345-doc.pdf',
                bucket: 'deal-documents',
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
        expect(global.fetch).toHaveBeenCalledWith('/api/diligence/upload-url', expect.objectContaining({
            method: 'POST',
        }))
    })

    it('uploads file directly to signed upload URL', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                signedUrl: 'https://supabase.co/storage/upload?token=xyz',
                path: 'deal-documents/doc.pdf',
                token: 'xyz',
                publicUrl: 'https://sihpsqrunkwkxhhnwoqe.supabase.co/storage/v1/object/public/deal-documents/doc.pdf',
                bucket: 'deal-documents',
            }),
        })

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

        expect(res.storageFileUrl).toContain('deal-documents/doc.pdf')
        expect(res.storagePath).toBe('deal-documents/doc.pdf')
        expect(onProgress).toHaveBeenCalledWith(100)
    })
})
