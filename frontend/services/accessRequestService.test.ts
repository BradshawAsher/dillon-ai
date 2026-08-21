import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitAccessRequest, supabase } from './accessRequestService'

describe('submitAccessRequest', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('submits successfully via backend API if available', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, id: 'req_123' })
        })

        const res = await submitAccessRequest({
            fullName: 'Jane Doe',
            workEmail: 'jane@fund.com',
            firmName: 'Apex Growth Equity',
            role: 'Associate'
        })

        expect(res.success).toBe(true)
        expect(res.id).toBe('req_123')
        expect(global.fetch).toHaveBeenCalledWith('/api/diligence/access-request', expect.any(Object))
    })

    it('falls back to Supabase and dispatches Slack alert when API fetch fails', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue({
            insert: vi.fn().mockResolvedValue({ error: null })
        } as unknown as ReturnType<typeof supabase.from>)

        global.fetch = vi.fn()
            .mockRejectedValueOnce(new Error('Network error on API')) // API attempt fails
            .mockResolvedValueOnce({ ok: true }) // Slack webhook dispatch

        const res = await submitAccessRequest({
            fullName: 'John Smith',
            workEmail: 'john@partner.com',
            firmName: 'Summit Capital',
            role: 'Partner'
        })

        expect(res.success).toBe(true)
        expect(res.id).toBeDefined()
    })
})

