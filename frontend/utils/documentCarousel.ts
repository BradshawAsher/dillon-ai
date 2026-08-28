import { batchDocumentKey } from './batchState'
import type { SubmissionHistoryItem } from './submissionHistory'

// Include attempts that never reached the server, without duplicating a file
// when its registered row eventually arrives. Do not use this list for synthesis.
export function mergeDocumentCarouselRows(projectRows: SubmissionHistoryItem[], batchRows: SubmissionHistoryItem[]) {
    const documents = new Map<string, SubmissionHistoryItem>()
    const timestamp = (row: SubmissionHistoryItem) => Math.max(0, ...[row.updatedAt, row.statusResolvedAt, row.processedAt, row.createdAt].map(value => Date.parse(value || '')).filter(Number.isFinite))
    for (const row of [...projectRows, ...batchRows]) {
        const key = row.fileName ? batchDocumentKey(row) : row.requestID || String(row.id)
        const previous = documents.get(key)
        if (!previous || timestamp(row) >= timestamp(previous)) documents.set(key, row)
    }
    return [...documents.values()]
}
