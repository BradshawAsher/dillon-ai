import { describe, expect, it } from 'vitest'
import { deriveBatchState, mergeBatchUploadAttempts } from './batchState'
import { batchCompletionTime } from './batchStop'
import type { SubmissionHistoryItem } from './submissionHistory'
import type { SubmissionBatch } from './diligenceDashboardUtils'

const start = Date.parse('2026-08-28T19:01:54.881Z')
const batch: SubmissionBatch = { id: 'batch', projectId: 'p', environment: 'production', expectedDocumentCount: 3, startedAt: start }
const row = (name: string, status = 'completed', fileSize = 100) => ({ requestID: name, fileName: name, fileSize, status, processedAt: new Date(start + 60_000).toISOString(), expectedBatchDocumentCount: 3 } as SubmissionHistoryItem)

describe('batch display and timer contract', () => {
    it('keeps three expected when only two documents arrived and pauses as incomplete, not complete', () => {
        const rows = [row('pnl'), row('prequal', 'failed')]
        expect(deriveBatchState(batch, rows)).toMatchObject({ expectedCount: 3, finishedCount: 2, completedCount: 1, failedCount: 1, missingCount: 1, isComplete: false, isInterrupted: true })
        expect(batchCompletionTime(batch, rows, start + 100_000)).toBeUndefined()
        expect(deriveBatchState(batch, rows, true).isInterrupted).toBe(false)
    })
    it('does not treat unknown statuses as finished', () => {
        expect(deriveBatchState(batch, [row('a'), row('b'), row('c', 'unknown')])).toMatchObject({ finishedCount: 2, isComplete: false, isInterrupted: false })
    })
    it('settles all terminal rows, including a timed-out row without an actual processing timestamp', () => {
        const timedOut = { ...row('prequal', 'failed'), processedAt: '', updatedAt: new Date(start + 2000).toISOString(), statusResolvedAt: new Date(start + 902_000).toISOString() }
        const rows = [row('pnl'), timedOut, row('c')]
        expect(deriveBatchState(batch, rows)).toMatchObject({ isComplete: true, failedCount: 1 })
        expect(batchCompletionTime(batch, rows)).toBe(start + 902_000)
    })
    it('uses observation time only for absent/invalid timestamps, not old pre-retry results', () => {
        const one = { ...batch, expectedDocumentCount: 1 }
        expect(batchCompletionTime(one, [{ ...row('a'), processedAt: 'bad', updatedAt: '' }], start + 100)).toBe(start + 100)
        expect(batchCompletionTime(one, [{ ...row('a'), processedAt: new Date(start - 100).toISOString() }], start + 100)).toBeUndefined()
        expect(batchCompletionTime({ ...one, endedAt: start + 100 }, [{ ...row('a'), processedAt: '', updatedAt: '' }], start + 200)).toBe(start + 100)
        expect(deriveBatchState({ ...one, requestIDs: ['a'] }, [{ ...row('a'), processedAt: new Date(start - 100).toISOString() }]).isComplete).toBe(false)
    })
    it('retains failed uploads through session serialization even when no database row exists', () => {
        const saved = JSON.parse(JSON.stringify({ ...batch, uploadAttempts: [{ fileName: 'large.pdf', fileSize: 18 * 1024 * 1024, fileType: 'application/pdf', status: 'upload_failed', errorMessage: 'R2 HTTP 503', updatedAt: new Date(start + 5000).toISOString() }] }))
        const rows = mergeBatchUploadAttempts(saved, [row('pnl'), row('prequal', 'failed')])
        expect(rows).toHaveLength(3)
        expect(rows[2]).toMatchObject({ fileName: 'large.pdf', status: 'upload_failed', errorMessage: 'R2 HTTP 503', requestID: '' })
        expect(deriveBatchState(saved, rows)).toMatchObject({ expectedCount: 3, finishedCount: 3, failedCount: 2, isComplete: true })
    })
    it('does not overwrite a live analysis with a client-side dispatch error', () => {
        const saved: SubmissionBatch = { ...batch, uploadAttempts: [{ fileName: 'pnl', fileSize: 100, fileType: '', status: 'upload_failed', updatedAt: new Date(start).toISOString() }] }
        const live = { ...row('pnl', 'processing'), processingStartedAt: new Date(start + 5000).toISOString() }
        expect(mergeBatchUploadAttempts(saved, [live])[0]).toEqual(live)
    })
    it('does not merge distinct same-name files of different sizes', () => {
        const saved: SubmissionBatch = { ...batch, uploadAttempts: [{ fileName: 'pnl', fileSize: 200, fileType: '', status: 'upload_failed', updatedAt: new Date(start).toISOString() }] }
        expect(mergeBatchUploadAttempts(saved, [row('pnl', 'completed', 100)])).toHaveLength(2)
    })
    it('times out a manifest-only upload after a page reload instead of spinning forever', () => {
        const saved: SubmissionBatch = { ...batch, uploadAttempts: [{ fileName: 'lost.pdf', fileSize: 100, fileType: '', status: 'uploading', updatedAt: new Date(start).toISOString() }] }
        expect(mergeBatchUploadAttempts(saved, [], start + 901_000)[0]).toMatchObject({ status: 'upload_failed', processedAt: '', statusResolvedAt: new Date(start + 900_000).toISOString() })
    })
})
