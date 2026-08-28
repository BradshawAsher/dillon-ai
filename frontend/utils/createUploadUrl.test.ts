import { describe, expect, it, vi } from 'vitest'
import createUploadUrl from '../../backend/diligence/createUploadUrl'

vi.mock('../../backend/supabaseClient', () => ({ supabase: { storage: { from: () => ({
    createSignedUploadUrl: async (path: string) => ({ data: { path, token: 'scoped', signedUrl: `https://dillon-ai-worker.bradshin231.workers.dev/storage/v1/object/upload/sign/deal-documents/${path}?token=scoped` } }),
    getPublicUrl: (path: string) => ({ data: { publicUrl: `https://dillon-ai-worker.bradshin231.workers.dev/storage/v1/object/public/deal-documents/${path}` } }),
}) } } }))

describe('independent storage upload tickets', () => {
    it('keeps the fallback independent of a proxied API client', async () => {
        const ticket = await createUploadUrl({ params: { fileName: 'deck.pdf', projectId: 'p' }, user: {} as any })
        expect(new URL(ticket.uploadUrl).host).toBe('dillon-ai-worker.bradshin231.workers.dev')
        expect(new URL(ticket.supabaseFallback.signedUrl).host).toBe('sihpsqrunkwkxhhnwoqe.storage.supabase.co')
        expect(new URL(ticket.supabaseFallback.publicUrl).host).toBe('sihpsqrunkwkxhhnwoqe.supabase.co')
        expect(ticket.supabaseFallback.resumableUrl).toBe('https://sihpsqrunkwkxhhnwoqe.storage.supabase.co/storage/v1/upload/resumable/sign')
    })
})
