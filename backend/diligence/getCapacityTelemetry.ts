import { supabase } from '../supabaseClient'

type Environment = 'production' | 'test'

export type CapacityDocumentRow = {
    id?: string | null
    request_id?: string | null
    project_id?: string | null
    submission_batch_id?: string | null
    status?: string | null
    processing_started_at?: string | null
    processed_at?: string | null
    created_at?: string | null
    updated_at?: string | null
    input_tokens?: number | string | null
    output_tokens?: number | string | null
    total_tokens?: number | string | null
    model_used?: string | null
    error_message?: string | null
}

export type CapacityBatchSummary = {
    batchId: string
    projectId: string
    documents: number
    completed: number
    failed: number
    peakConcurrentDocuments: number
    startedAt: string | null
    finishedAt: string | null
    durationSeconds: number | null
}

export type CapacityTelemetry = {
    generatedAt: string
    environment: Environment
    lookbackDays: number
    sampleDocuments: number
    completedWithTiming: number
    current: {
        processingDocuments: number
        queuedDocuments: number
        activeBatches: number
        staleActiveDocuments: number
    }
    observed: {
        peakConcurrentDocuments: number
        peakConcurrentBatches: number
        peakAt: string | null
        durationP50Seconds: number | null
        durationP95Seconds: number | null
        inputTokensP50: number | null
        inputTokensP95: number | null
        totalTokensP50: number | null
        totalTokensP95: number | null
    }
    reliability: {
        failedDocuments: number
        failureRate: number
        rateLimitSignals: number
    }
    modelMix: Array<{ model: string; documents: number }>
    recentBatches: CapacityBatchSummary[]
}

const PROCESSING_STATUSES = new Set(['processing', 'running'])
const QUEUED_STATUSES = new Set(['uploading', 'accepted', 'queued', 'received', 'submitted'])
const ACTIVE_STATUSES = new Set([...PROCESSING_STATUSES, ...QUEUED_STATUSES])
const RATE_LIMIT_PATTERN = /(429|rate.?limit|quota|tokens?.?per.?minute|requests?.?per.?minute|\btpm\b|\brpm\b)/i
const MAX_INTERVAL_MS = 6 * 60 * 60 * 1000
const STALE_ACTIVE_MS = 20 * 60 * 1000

function asTimestamp(value: unknown): number | null {
    if (!value) return null
    const timestamp = new Date(String(value)).getTime()
    return Number.isFinite(timestamp) ? timestamp : null
}

function asPositiveNumber(value: unknown): number | null {
    const number = Number(value)
    return Number.isFinite(number) && number > 0 ? number : null
}

function percentile(values: number[], fraction: number): number | null {
    if (values.length === 0) return null
    const sorted = [...values].sort((a, b) => a - b)
    const index = (sorted.length - 1) * fraction
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const interpolated = sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
    return Math.round(interpolated * 10) / 10
}

type Interval = { start: number; end: number; batchId: string }

function intervalForRow(row: CapacityDocumentRow, nowMs: number): Interval | null {
    const start = asTimestamp(row.processing_started_at)
    if (start === null) return null

    const completedEnd = asTimestamp(row.processed_at)
    const normalizedStatus = String(row.status ?? '').trim().toLowerCase()
    const freshActive = ACTIVE_STATUSES.has(normalizedStatus)
        && nowMs - Math.max(asTimestamp(row.updated_at) ?? 0, asTimestamp(row.created_at) ?? 0, start) <= STALE_ACTIVE_MS
    const end = completedEnd ?? (freshActive ? nowMs : null)
    if (end === null || end <= start || end - start > MAX_INTERVAL_MS) return null

    const batchId = String(row.submission_batch_id || row.project_id || row.request_id || row.id || 'unknown')
    return { start, end, batchId }
}

function concurrencyPeaks(intervals: Interval[]) {
    const events = intervals.flatMap((interval) => [
        { at: interval.start, delta: 1 as const, batchId: interval.batchId },
        { at: interval.end, delta: -1 as const, batchId: interval.batchId },
    ]).sort((a, b) => a.at - b.at || a.delta - b.delta)

    let documents = 0
    let peakConcurrentDocuments = 0
    let peakConcurrentBatches = 0
    let peakAt: number | null = null
    const batchCounts = new Map<string, number>()

    for (const event of events) {
        documents += event.delta
        const nextBatchCount = (batchCounts.get(event.batchId) ?? 0) + event.delta
        if (nextBatchCount <= 0) batchCounts.delete(event.batchId)
        else batchCounts.set(event.batchId, nextBatchCount)

        if (documents > peakConcurrentDocuments) {
            peakConcurrentDocuments = documents
            peakAt = event.at
        }
        peakConcurrentBatches = Math.max(peakConcurrentBatches, batchCounts.size)
    }

    return {
        peakConcurrentDocuments,
        peakConcurrentBatches,
        peakAt: peakAt === null ? null : new Date(peakAt).toISOString(),
    }
}

export function calculateCapacityTelemetry(
    rows: CapacityDocumentRow[],
    options: { environment?: Environment; lookbackDays?: number; now?: Date } = {},
): CapacityTelemetry {
    const environment = options.environment === 'test' ? 'test' : 'production'
    const lookbackDays = Math.min(90, Math.max(1, Math.round(options.lookbackDays ?? 30)))
    const now = options.now ?? new Date()
    const nowMs = now.getTime()
    const intervals = rows.map((row) => intervalForRow(row, nowMs)).filter((value): value is Interval => value !== null)
    const peaks = concurrencyPeaks(intervals)

    const completedDurations = intervals
        .filter((interval) => interval.end < nowMs)
        .map((interval) => (interval.end - interval.start) / 1000)
    const inputTokens = rows.map((row) => asPositiveNumber(row.input_tokens)).filter((value): value is number => value !== null)
    const totalTokens = rows.map((row) => asPositiveNumber(row.total_tokens)).filter((value): value is number => value !== null)

    let processingDocuments = 0
    let queuedDocuments = 0
    let staleActiveDocuments = 0
    let failedDocuments = 0
    let rateLimitSignals = 0
    const activeBatchIds = new Set<string>()
    const modelCounts = new Map<string, number>()

    for (const row of rows) {
        const status = String(row.status ?? '').trim().toLowerCase()
        const lastActivity = Math.max(
            asTimestamp(row.updated_at) ?? 0,
            asTimestamp(row.created_at) ?? 0,
            asTimestamp(row.processing_started_at) ?? 0,
        )
        const isFresh = ACTIVE_STATUSES.has(status) && nowMs - lastActivity <= STALE_ACTIVE_MS
        if (isFresh) {
            if (PROCESSING_STATUSES.has(status)) processingDocuments += 1
            else if (QUEUED_STATUSES.has(status)) queuedDocuments += 1
            activeBatchIds.add(String(row.submission_batch_id || row.project_id || row.request_id || row.id || 'unknown'))
        } else if (ACTIVE_STATUSES.has(status)) {
            staleActiveDocuments += 1
        }

        const errorMessage = String(row.error_message ?? '')
        if (status.includes('fail')) failedDocuments += 1
        if (RATE_LIMIT_PATTERN.test(errorMessage)) rateLimitSignals += 1

        const model = String(row.model_used ?? '').trim() || 'Unreported'
        modelCounts.set(model, (modelCounts.get(model) ?? 0) + 1)
    }

    const batchRows = new Map<string, CapacityDocumentRow[]>()
    for (const row of rows) {
        const batchId = String(row.submission_batch_id ?? '').trim()
        if (!batchId) continue
        const group = batchRows.get(batchId) ?? []
        group.push(row)
        batchRows.set(batchId, group)
    }

    const recentBatches = [...batchRows.entries()].map(([batchId, batchDocuments]) => {
        const batchIntervals = batchDocuments
            .map((row) => intervalForRow(row, nowMs))
            .filter((value): value is Interval => value !== null)
        const starts = batchIntervals.map((interval) => interval.start)
        const ends = batchIntervals.map((interval) => interval.end)
        const startedAtMs = starts.length > 0 ? Math.min(...starts) : null
        const finishedAtMs = ends.length > 0 ? Math.max(...ends) : null
        return {
            batchId,
            projectId: String(batchDocuments.find((row) => row.project_id)?.project_id ?? ''),
            documents: batchDocuments.length,
            completed: batchDocuments.filter((row) => ['completed', 'approved'].includes(String(row.status ?? '').toLowerCase())).length,
            failed: batchDocuments.filter((row) => String(row.status ?? '').toLowerCase().includes('fail')).length,
            peakConcurrentDocuments: concurrencyPeaks(batchIntervals).peakConcurrentDocuments,
            startedAt: startedAtMs === null ? null : new Date(startedAtMs).toISOString(),
            finishedAt: finishedAtMs === null ? null : new Date(finishedAtMs).toISOString(),
            durationSeconds: startedAtMs === null || finishedAtMs === null ? null : Math.round((finishedAtMs - startedAtMs) / 100) / 10,
        }
    }).sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? '')).slice(0, 8)

    return {
        generatedAt: now.toISOString(),
        environment,
        lookbackDays,
        sampleDocuments: rows.length,
        completedWithTiming: completedDurations.length,
        current: {
            processingDocuments,
            queuedDocuments,
            activeBatches: activeBatchIds.size,
            staleActiveDocuments,
        },
        observed: {
            ...peaks,
            durationP50Seconds: percentile(completedDurations, 0.5),
            durationP95Seconds: percentile(completedDurations, 0.95),
            inputTokensP50: percentile(inputTokens, 0.5),
            inputTokensP95: percentile(inputTokens, 0.95),
            totalTokensP50: percentile(totalTokens, 0.5),
            totalTokensP95: percentile(totalTokens, 0.95),
        },
        reliability: {
            failedDocuments,
            failureRate: rows.length > 0 ? Math.round((failedDocuments / rows.length) * 10_000) / 100 : 0,
            rateLimitSignals,
        },
        modelMix: [...modelCounts.entries()]
            .map(([model, documents]) => ({ model, documents }))
            .sort((a, b) => b.documents - a.documents),
        recentBatches,
    }
}

export default async function getCapacityTelemetry({
    params,
}: {
    params?: { environment?: Environment; lookbackDays?: number | string }
    user?: unknown
} = {}) {
    const environment = params?.environment === 'test' ? 'test' : 'production'
    const requestedDays = Number(params?.lookbackDays ?? 30)
    const lookbackDays = Number.isFinite(requestedDays) ? Math.min(90, Math.max(1, Math.round(requestedDays))) : 30
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()
    const columns = 'id, request_id, project_id, submission_batch_id, status, processing_started_at, processed_at, created_at, updated_at, input_tokens, output_tokens, total_tokens, model_used, error_message'
    const rows: CapacityDocumentRow[] = []
    const pageSize = 1000

    for (let from = 0; from < 5000; from += pageSize) {
        const { data, error } = await supabase
            .from('documents')
            .select(columns)
            .eq('environment', environment)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .range(from, from + pageSize - 1)

        if (error) {
            console.error('[getCapacityTelemetry] Supabase query error:', error)
            throw error
        }

        const page = (data ?? []) as CapacityDocumentRow[]
        rows.push(...page)
        if (page.length < pageSize) break
    }

    return calculateCapacityTelemetry(rows, { environment, lookbackDays })
}
