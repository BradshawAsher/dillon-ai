import type { SubmissionBatch, SubmitEnvironment } from './diligenceDashboardUtils'
import { isTerminalSubmissionStatus, type SubmissionHistoryItem } from './submissionHistory'

export function getBatchStopTarget(rows: SubmissionHistoryItem[], projectId: string, environment: SubmitEnvironment, batch: SubmissionBatch | null) {
    const scoped = rows.filter((row) => row.projectId === projectId && row.environment === environment)
    const explicitIds = batch?.requestIDs?.length ? new Set(batch.requestIDs) : null
    // A row missing both timestamps yields NaN from Date.parse, and a comparator
    // that returns NaN leaves the sort order (and therefore the "latest" pick)
    // undefined. Coerce to a finite epoch so the newest row is chosen deterministically.
    const rowTime = (row: SubmissionHistoryItem) => {
        const t = Date.parse(row.createdAt || row.receivedAt || '')
        return Number.isFinite(t) ? t : 0
    }
    const latest = [...scoped].sort((a, b) => rowTime(b) - rowTime(a))[0]
    const submissionBatchId = explicitIds ? '' : batch?.id && batch.id !== projectId ? batch.id : latest?.submissionBatchId || ''
    const selected = scoped.filter((row) => explicitIds ? explicitIds.has(row.requestID) : submissionBatchId && row.submissionBatchId === submissionBatchId)
    return { projectId, environment, submissionBatchId, requestIDs: [...new Set(selected.map((row) => row.requestID).filter(Boolean))] }
}

export type BatchStopResponse = {
    ok?: boolean
    error?: string
    stopped?: number
    canceledExecutions?: number
    cancellationAvailable?: boolean
    errors?: string[]
}

export function requireConfirmedBatchStop(response: BatchStopResponse | null | undefined) {
    // A missing response body (network error, empty 200) must surface the same
    // clear "not confirmed" error, not an opaque "cannot read properties of
    // undefined" TypeError from reading `.ok` off nothing.
    if (!response || response.ok !== true || response.cancellationAvailable !== true || response.errors?.length) {
        throw new Error(response?.errors?.join(' ') || response?.error || 'Stop was not confirmed. Retry Stop Batch.')
    }
}

export function batchCompletionTime(batch: SubmissionBatch, rows: SubmissionHistoryItem[]) {
    // Without a positive expected count we can't assert the batch is complete:
    // `rows.length < undefined` (or `< 0`) is false, which would otherwise let a
    // batch with a missing/zero expectation report completion prematurely.
    const expected = Number.isFinite(batch.expectedDocumentCount) ? batch.expectedDocumentCount : 0
    if (expected <= 0 || batch.stopError || rows.length === 0 || rows.length < expected || !rows.every((row) => isTerminalSubmissionStatus(row.status))) return undefined
    const times = rows.map((row) => Date.parse(row.processedAt || row.updatedAt || '')).filter(Number.isFinite)
    return times.length === rows.length && times.every((time) => time >= batch.startedAt) ? Math.max(...times) : undefined
}

export function createBatchQueue(id: string) {
    let canceled = false
    const pending = new Set<Promise<unknown>>()
    return {
        id,
        requestIDs: new Set<string>(),
        get canceled() { return canceled },
        async run<T>(work: () => Promise<T>): Promise<T | undefined> {
            if (canceled) return undefined
            const task = work()
            pending.add(task)
            try { return await task } finally { pending.delete(task) }
        },
        async stop() {
            canceled = true
            await Promise.allSettled([...pending])
        },
    }
}
