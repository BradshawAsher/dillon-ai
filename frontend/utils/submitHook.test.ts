import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react', async () => ({ ...(await vi.importActual('react')), useState: (initial: unknown) => [initial, vi.fn()], useCallback: (callback: unknown) => callback }))
vi.mock('../lib/dataSource', () => ({ getDataSource: () => 'live' }))
import { useSubmitDealPacket } from '../hooks/backend/diligence'

afterEach(() => vi.unstubAllGlobals())

describe('submit hook error propagation', () => {
    it('rejects with the actual API error instead of returning null as a success', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'n8n rejected upload' }, { status: 503 })))
        await expect(useSubmitDealPacket().trigger({ fileName: 'a.pdf' }).result).rejects.toThrow('n8n rejected upload')
    })
})
