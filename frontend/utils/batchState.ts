import type { SubmissionBatch } from './diligenceDashboardUtils'
import { isActiveSubmissionStatus, isFailedSubmissionStatus, isTerminalSubmissionStatus, type SubmissionHistoryItem } from './submissionHistory'

export type BatchUploadAttempt = {
    fileName: string
    sourceRelativePath?: string
    fileSize: number
    fileType: string
    status: 'uploading' | 'queued' | 'upload_failed' | 'duplicate'
    updatedAt: string
    requestID?: string
    errorMessage?: string
}

export function batchDocumentKey(row: { fileName: string; sourceRelativePath?: string; fileSize?: number }) {
    const name = (row.sourceRelativePath || row.fileName || '').trim().replace(/\\/g, '/').toLowerCase()
    const size = typeof row.fileSize === 'number' && row.fileSize > 0 ? row.fileSize : 0
    return size > 0 ? `${name}::${size}` : name
}

function parseTimestamp(value: unknown): number | null {
    if (typeof value !== 'string' || !value.trim()) return null
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function rowStartTime(row: SubmissionHistoryItem): number | null {
    for (const value of [row.receivedAt, row.createdAt, row.triggerTimestamp, row.processingStartedAt, row.updatedAt]) {
        const parsed = parseTimestamp(value)
        if (parsed !== null) return parsed
    }
    return null
}

function rowEndTime(row: SubmissionHistoryItem): number | null {
    for (const value of [row.processedAt, row.statusResolvedAt, row.updatedAt]) {
        const parsed = parseTimestamp(value)
        if (parsed !== null) return parsed
    }
    return null
}

function batchIdStartTime(batchId: string): number | null {
    const match = batchId.match(/^batch-(\d{13})(?:-|$)/i)
    if (!match) return null
    const parsed = Number(match[1])
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function selectLatestSubmissionBatchRows(rows: SubmissionHistoryItem[]): SubmissionHistoryItem[] {
    if (rows.length === 0) return []
    const newestBatchedRow = [...rows]
        .filter((row) => Boolean(row.submissionBatchId))
        .sort((a, b) => (rowStartTime(b) || 0) - (rowStartTime(a) || 0))[0]
    if (!newestBatchedRow?.submissionBatchId) return rows
    return rows.filter((row) => row.submissionBatchId === newestBatchedRow.submissionBatchId)
}

export function reconstructSubmissionBatch(
    rows: SubmissionHistoryItem[],
    projectId: string,
): SubmissionBatch | null {
    const scopedRows = selectLatestSubmissionBatchRows(rows)
    if (scopedRows.length === 0) return null

    const batchId = scopedRows.find((row) => row.submissionBatchId)?.submissionBatchId || projectId
    const rowStarts = scopedRows.map(rowStartTime).filter((value): value is number => value !== null)
    const encodedStart = batchIdStartTime(batchId)
    const earliestRowStart = rowStarts.length > 0 ? Math.min(...rowStarts) : null
    const encodedStartIsPlausible = encodedStart !== null && (
        earliestRowStart === null || Math.abs(earliestRowStart - encodedStart) <= 24 * 60 * 60 * 1000
    )
    const startedAt = encodedStartIsPlausible ? encodedStart : earliestRowStart
    if (startedAt === null) return null

    const expectedFromRows = Math.max(0, ...scopedRows.map((row) => {
        const value = Number(row.expectedBatchDocumentCount)
        return Number.isFinite(value) && value > 0 ? value : 0
    }))
    const expectedDocumentCount = Math.max(scopedRows.length, expectedFromRows)
    const observedRowsAreTerminal = scopedRows.every((row) => isTerminalSubmissionStatus(row.status))
    const allTerminal = expectedDocumentCount > 0 && scopedRows.length >= expectedDocumentCount && observedRowsAreTerminal
    const rowEnds = scopedRows.map(rowEndTime).filter((value): value is number => value !== null && value >= startedAt)
    const endedAt = allTerminal && rowEnds.length > 0 ? Math.max(...rowEnds) : undefined
    const interruptedAt = !allTerminal && observedRowsAreTerminal && rowEnds.length > 0 ? Math.max(...rowEnds) : undefined
    const environment = scopedRows.find((row) => row.environment === 'test')?.environment === 'test' ? 'test' : 'production'

    return {
        id: batchId,
        projectId,
        expectedDocumentCount,
        environment,
        startedAt,
        ...(endedAt !== undefined ? { endedAt } : {}),
        ...(interruptedAt !== undefined ? { interruptedAt } : {}),
        requestIDs: [...new Set(scopedRows.map((row) => row.requestID).filter(Boolean))],
    }
}

export function submissionBatchElapsedSeconds(batch: SubmissionBatch | null, now = Date.now()): number {
    if (!batch?.startedAt || !Number.isFinite(batch.startedAt)) return 0
    const end = batch.endedAt || batch.interruptedAt || batch.stoppedAt || now
    if (!Number.isFinite(end)) return 0
    return Math.max(0, Math.floor((end - batch.startedAt) / 1000))
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
            sourceRelativePath: attempt.sourceRelativePath || attempt.fileName,
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
