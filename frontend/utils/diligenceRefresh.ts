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

type SynthesisRecency = {
    id?: string | number | null
    updatedAt?: string | null
    projectProcessedAt?: string | null
    createdAt?: string | null
}

export const SYNTHESIS_ACTIVITY_TIMEOUT_MS = 10 * 60 * 1000

function synthesisTimestamp(row: SynthesisRecency): number {
    const timestamps = [row.updatedAt, row.projectProcessedAt, row.createdAt]
        .map((value) => value ? Date.parse(value) : 0)
        .filter((value) => Number.isFinite(value) && value > 0)
    return timestamps.length > 0 ? Math.max(...timestamps) : 0
}

/**
 * Realtime/scoped refreshes can append a new synthesis version behind an
 * older placeholder. Keep the shared collection newest-first so consumers
 * using `find()` cannot mistake `awaiting_documents` for the active result.
 */
export function sortSynthesisRowsNewestFirst<T extends SynthesisRecency>(rows: T[]): T[] {
    return [...rows].sort((a, b) => {
        const timeDifference = synthesisTimestamp(b) - synthesisTimestamp(a)
        if (timeDifference !== 0) return timeDifference

        const idA = Number(a.id)
        const idB = Number(b.id)
        if (Number.isFinite(idA) && Number.isFinite(idB) && idA !== idB) return idB - idA
        return 0
    })
}

/**
 * A synthesis that has produced no database activity for this window should
 * not keep the dashboard timer and fallback polling alive indefinitely.
 */
export function isSynthesisActivityFresh(
    timestamps: Array<string | null | undefined>,
    now = Date.now(),
    timeoutMs = SYNTHESIS_ACTIVITY_TIMEOUT_MS,
): boolean {
    const latestActivity = timestamps
        .map((value) => value ? Date.parse(value) : 0)
        .filter((value) => Number.isFinite(value) && value > 0)
        .reduce((latest, value) => Math.max(latest, value), 0)

    return latestActivity > 0 && now - latestActivity <= timeoutMs
}
