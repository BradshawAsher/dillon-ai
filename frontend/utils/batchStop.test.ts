import { describe, expect, it, vi } from 'vitest'
import { batchCompletionTime, createBatchQueue, getBatchStopTarget, requireConfirmedBatchStop } from './batchStop'
import type { SubmissionHistoryItem } from './submissionHistory'

const batch = { id: 'batch-a', projectId: 'p', environment: 'production' as const, expectedDocumentCount: 2, startedAt: 1000 }
const row = (requestID: string, projectId = 'p', submissionBatchId = 'batch-a', environment = 'production') => ({ requestID, projectId, submissionBatchId, environment, createdAt: '2026-08-27T00:00:00Z' } as SubmissionHistoryItem)

describe('batch stop UI contract', () => {
    it('never falls back to active documents in other projects or batches', () => {
        expect(getBatchStopTarget([row('a'), row('b', 'p', 'batch-b'), row('c', 'other'), row('d', 'p', 'batch-a', 'test')], 'p', 'production', batch).requestIDs).toEqual(['a'])
    })
    it('retains a known batch ID before its first document arrives', () => {
        expect(getBatchStopTarget([row('b', 'p', 'batch-b')], 'p', 'production', batch)).toMatchObject({ submissionBatchId: 'batch-a', requestIDs: [] })
    })
    it('still resolves a target when a scoped row is missing its timestamps', () => {
        const noTime = { requestID: 'z', projectId: 'p', submissionBatchId: 'batch-a', environment: 'production' } as SubmissionHistoryItem
        // The undated row must not throw or scramble the latest-row selection.
        expect(getBatchStopTarget([noTime, row('a')], 'p', 'production', null).requestIDs.sort()).toEqual(['a', 'z'])
    })
    it('limits synthetic rerun batches to explicitly tracked documents', () => {
        expect(getBatchStopTarget([row('a'), row('b')], 'p', 'production', { ...batch, id: 'p', requestIDs: ['a'] })).toMatchObject({ submissionBatchId: '', requestIDs: ['a'] })
    })
    it.each([{}, { ok: false }, { ok: true, cancellationAvailable: false }, { ok: true, cancellationAvailable: true, errors: ['n8n failed'] }])('rejects unconfirmed stop results', (response) => {
        expect(() => requireConfirmedBatchStop(response)).toThrow()
    })
    it('accepts a confirmed no-op stop', () => {
        expect(() => requireConfirmedBatchStop({ ok: true, cancellationAvailable: true, errors: [] })).not.toThrow()
    })
    it('rejects a null/undefined response with the clean not-confirmed error', () => {
        expect(() => requireConfirmedBatchStop(null)).toThrow('Stop was not confirmed. Retry Stop Batch.')
        expect(() => requireConfirmedBatchStop(undefined)).toThrow('Stop was not confirmed. Retry Stop Batch.')
    })
    it('does not freeze incomplete or failed stop timers', () => {
        const done = { ...row('a'), status: 'completed', processedAt: '2026-08-27T01:00:00Z' }
        expect(batchCompletionTime(batch, [done])).toBeUndefined()
        expect(batchCompletionTime({ ...batch, stopError: 'failed' }, [done, done])).toBeUndefined()
        expect(batchCompletionTime(batch, [done, done])).toBe(Date.parse(done.processedAt))
        expect(batchCompletionTime({ ...batch, startedAt: Date.parse(done.processedAt) + 1 }, [done, done])).toBeUndefined()
        // A batch with no positive expected count cannot be declared complete.
        expect(batchCompletionTime({ ...batch, expectedDocumentCount: 0 }, [done, done])).toBeUndefined()
        expect(batchCompletionTime({ ...batch, expectedDocumentCount: undefined as unknown as number }, [done, done])).toBeUndefined()
    })
    it('stops new dispatches and waits for existing submissions to settle', async () => {
        const queue = createBatchQueue('batch-a')
        let finish!: () => void
        const running = queue.run(() => new Promise<void>((resolve) => { finish = resolve }))
        let settled = false
        const stop = queue.stop().then(() => { settled = true })
        const next = vi.fn(async () => 1)
        await queue.run(next)
        expect(queue.canceled).toBe(true)
        expect(next).not.toHaveBeenCalled()
        expect(settled).toBe(false)
        finish()
        await running
        await stop
        expect(settled).toBe(true)
    })
})
