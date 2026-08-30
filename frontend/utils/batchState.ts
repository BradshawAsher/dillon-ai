import type { SubmissionBatch } from './diligenceDashboardUtils'
import { isActiveSubmissionStatus, isFailedSubmissionStatus, isTerminalSubmissionStatus, type SubmissionHistoryItem } from './submissionHistory'

export type BatchUploadAttempt = {
    fileName: string
    fileSize: number
    fileType: string
    status: 'uploading' | 'queued' | 'upload_failed' | 'duplicate'
    updatedAt: string
    requestID?: string
    errorMessage?: string
}

export function batchDocumentKey(row: { fileName: string; fileSize?: number }) {
    const name = (row.fileName || '').trim().toLowerCase()
    const size = typeof row.fileSize === 'number' && row.fileSize > 0 ? row.fileSize : 0
    return size > 0 ? `${name}::${size}` : name
}

// A session-persisted manifest keeps pre-registration upload failures visible.
// Actual server results always win once processing has started.
export function mergeBatchUploadAttempts(batch: SubmissionBatch, rows: SubmissionHistoryItem[], now = Date.now()): SubmissionHistoryItem[] {
    const merged = [...rows]
    for (const savedAttempt of batch.uploadAttempts || []) {
        const timedOutAt = Date.parse(savedAttempt.updatedAt) + Math.max(600, batch.expectedDocumentCount * 300) * 1000
        const attempt = ['uploading', 'queued'].includes(savedAttempt.status) && Number.isFinite(timedOutAt) && now > timedOutAt
            ? { ...savedAttempt, status: 'upload_failed' as const, updatedAt: new Date(timedOutAt).toISOString(), errorMessage: 'This upload never appeared in document history before the timeout. Re-select and upload the file again.' }
            : savedAttempt
        if (attempt.status === 'duplicate') continue
        const index = merged.findIndex(row => {
            if (attempt.requestID && row.requestID && attempt.requestID === row.requestID) return true
            const rowKey = batchDocumentKey(row)
            const attemptKey = batchDocumentKey(attempt)
            if (rowKey === attemptKey) return true
            if ((row.fileName || '').trim().toLowerCase() === (attempt.fileName || '').trim().toLowerCase() && (!row.fileSize || !attempt.fileSize)) {
                return true
            }
            return false
        })
        const live = merged[index]
        if (live && (attempt.status !== 'upload_failed' || live.processingStartedAt || isTerminalSubmissionStatus(live.status))) continue
        const local = {
            ...live,
            requestID: live?.requestID || attempt.requestID || '',
            projectId: batch.projectId || batch.id,
            submissionBatchId: batch.id,
            expectedBatchDocumentCount: batch.expectedDocumentCount,
            environment: batch.environment,
            fileName: attempt.fileName,
            fileSize: attempt.fileSize,
            fileType: attempt.fileType,
            status: attempt.status,
            errorMessage: attempt.errorMessage || '',
            updatedAt: attempt.updatedAt,
            createdAt: live?.createdAt || new Date(batch.startedAt).toISOString(),
            processedAt: live?.processedAt || '',
            statusResolvedAt: attempt.status === 'upload_failed' ? attempt.updatedAt : '',
            isConsidered: true,
        } as SubmissionHistoryItem
        if (index >= 0) merged[index] = local
        else merged.push(local)
    }
    return merged
}

export function deriveBatchState(batch: SubmissionBatch | null, rows: SubmissionHistoryItem[], submitting = false) {
    const positive = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0
    // Never reduce the expectation just because an upload has not arrived.
    const expectedCount = Math.max(rows.length, positive(batch?.expectedDocumentCount) || Math.max(0, ...rows.map(row => positive(row.expectedBatchDocumentCount))))
    const finishedCount = rows.filter(row => {
        if (!isTerminalSubmissionStatus(row.status)) return false
        const resultTime = [row.processedAt, row.statusResolvedAt, row.updatedAt].map(value => Date.parse(value || '')).find(Number.isFinite)
        // Do not show old completed results as a completed retry before the
        // retry request has produced a fresh row/status.
        return !batch?.requestIDs?.length || resultTime === undefined || resultTime >= batch.startedAt
    }).length
    const processingCount = rows.filter(row => isActiveSubmissionStatus(row.status)).length
    const failedCount = rows.filter(row => isFailedSubmissionStatus(row.status)).length
    const completedCount = rows.filter(row => ['completed', 'approved'].includes((row.status || '').trim().toLowerCase())).length
    const missingCount = Math.max(0, expectedCount - rows.length)
    const settled = !submitting && !batch?.stopError && expectedCount > 0 && finishedCount === rows.length
    return {
        expectedCount, finishedCount, processingCount, failedCount, completedCount, missingCount,
        isComplete: settled && missingCount === 0,
        isInterrupted: settled && missingCount > 0,
        errors: rows.filter(row => row.errorMessage).map(row => ({ fileName: row.fileName, errorMessage: row.errorMessage, requestID: row.requestID })),
    }
}
