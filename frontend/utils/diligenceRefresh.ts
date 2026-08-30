import { isActiveSubmissionStatus, isTerminalSubmissionStatus } from './submissionHistory'

type RefreshBatch = {
    endedAt?: number
    interruptedAt?: number
    stoppedAt?: number
    stopError?: string
} | null

export function shouldPollDiligence(params: {
    activeBatch: RefreshBatch
    batchIsComplete: boolean
    hasActiveSubmissions: boolean
    isProcessingDocuments: boolean
    isAwaitingSynthesis: boolean
}) {
    const batch = params.activeBatch
    const hasUnfinishedBatch = Boolean(
        batch
        && !batch.endedAt
        && !batch.interruptedAt
        && !batch.stoppedAt
        && !batch.stopError
        && !params.batchIsComplete
    )

    return hasUnfinishedBatch
        || params.hasActiveSubmissions
        || params.isProcessingDocuments
        || params.isAwaitingSynthesis
}

export function mergeDiligenceRows<T extends Record<string, any>>(
    current: T[] | null,
    incoming: T[],
    keyOf: (row: T) => string,
    incomingWins = true,
) {
    const merged = [...(current ?? [])]
    const indexByKey = new Map<string, number>()

    merged.forEach((row, index) => {
        const key = keyOf(row)
        if (key) indexByKey.set(key, index)
    })

    for (const row of incoming) {
        const key = keyOf(row)
        if (!key || !indexByKey.has(key)) {
            merged.push(row)
            if (key) indexByKey.set(key, merged.length - 1)
            continue
        }

        const index = indexByKey.get(key)!
        const existing = merged[index]

        // Guard against out-of-order stale in-flight polls downgrading completed rows
        const existingIsTerminal = isTerminalSubmissionStatus(existing?.status)
        const incomingIsActive = isActiveSubmissionStatus(row?.status)

        let mergedRow: T
        if (existingIsTerminal && incomingIsActive) {
            // Incoming is an older in-flight snapshot arriving after completion: preserve terminal status and timestamps
            mergedRow = { ...row, ...existing }
        } else {
            mergedRow = incomingWins
                ? { ...existing, ...row }
                : { ...row, ...existing }
        }

        merged[index] = mergedRow
    }

    return merged
}
