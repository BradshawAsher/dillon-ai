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

export function mergeDiligenceRows<T>(
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
        merged[index] = incomingWins
            ? { ...merged[index], ...row }
            : { ...row, ...merged[index] }
    }

    return merged
}
