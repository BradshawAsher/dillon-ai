import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import submitDealPacket from '../../backend/diligence/submitDealPacket'

const db = vi.hoisted(() => ({ updates: [] as any[], filters: [] as any[], registrationError: null as { message: string } | null }))
vi.mock('../../backend/supabaseClient', () => ({ supabase: { from: () => ({
    upsert: async () => ({ error: db.registrationError }),
    update: (value: unknown) => {
        db.updates.push(value)
        const query = { eq: (key: string, val: string) => { db.filters.push([key, val]); return query }, then: (resolve: (value: unknown) => unknown) => resolve({ error: null }) }
        return query
    },
}) } }))

const params = { fileName: 'large.pdf', sourceRelativePath: 'Target/01 Financials/large.pdf', fileSize: 18 * 1024 * 1024, fileType: 'application/pdf', dealName: 'Test', companyName: 'Test', workstream: '', submissionNotes: '', projectId: 'p', projectStage: 'post-loi', documentType: 'auto-detect', submissionBatchId: 'batch', expectedBatchDocumentCount: 3, storageFileUrl: 'https://dillon-ai-worker.bradshin231.workers.dev/p/doc.pdf', skipDuplicateCheck: true }
const user = { fullName: 'Test', email: 'test@example.com' }
beforeEach(() => { db.updates = []; db.filters = []; db.registrationError = null })
afterEach(() => vi.unstubAllGlobals())

describe('submission dispatch', () => {
    it('does not start the workflow if the durable document record cannot be created', async () => {
        db.registrationError = { message: 'database unavailable' }
        const request = vi.fn()
        vi.stubGlobal('n8nFinancialAgent', { rawRequest: request })
        await expect(submitDealPacket({ params, user })).rejects.toThrow('could not be registered')
        expect(request).not.toHaveBeenCalled()
    })
    it.each([null, {}, { error: 'File rejected by n8n' }])('rejects empty/error HTTP 200 bodies instead of pretending the upload was accepted', async (data) => {
        vi.stubGlobal('n8nFinancialAgent', { rawRequest: vi.fn().mockResolvedValue({ data }) })
        await expect(submitDealPacket({ params, user })).rejects.toThrow()
        expect(db.updates[0].status).toBe('upload_failed')
    })
    it('passes storage metadata to the streaming runtime instead of downloading a base64 copy', async () => {
        const request = vi.fn().mockResolvedValue({ data: { status: 'accepted', requestID: 'ack' } })
        vi.stubGlobal('n8nFinancialAgent', { rawRequest: request })
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
        expect((await submitDealPacket({ params, user })).status).toBe('accepted')
        expect(fetchMock).not.toHaveBeenCalled()
        expect(request.mock.calls[0][0].formData).toContainEqual(expect.objectContaining({ key: 'file', fileUrl: params.storageFileUrl, fileSize: params.fileSize }))
        expect(request.mock.calls[0][0].formData).toContainEqual({ key: 'sourceRelativePath', value: params.sourceRelativePath })
    })
    it('records the actual dispatch failure without overwriting an already-running workflow', async () => {
        vi.stubGlobal('n8nFinancialAgent', { rawRequest: vi.fn().mockRejectedValue(new Error('n8n HTTP 503')) })
        await expect(submitDealPacket({ params, user })).rejects.toThrow('n8n HTTP 503')
        expect(db.updates[0]).toMatchObject({ status: 'upload_failed', error_message: 'n8n HTTP 503' })
        expect(db.filters).toEqual(expect.arrayContaining([['status', 'queued'], ['project_id', 'p'], ['environment', 'production']]))
    })
    it('does not submit without an uploaded binary', async () => {
        const request = vi.fn()
        vi.stubGlobal('n8nFinancialAgent', { rawRequest: request })
        await expect(submitDealPacket({ params: { ...params, storageFileUrl: '' }, user })).rejects.toThrow('No uploaded document')
        expect(request).not.toHaveBeenCalled()
    })
})
