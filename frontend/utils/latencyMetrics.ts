// Pure latency instrumentation over document submission history.
//
// Each `documents` row already carries received / processing-started / processed
// timestamps written by the n8n per-document workflow, but nothing in the app
// computed the deltas, so end-to-end and per-stage latency were previously
// unmeasurable. These helpers turn those raw timestamps into reportable numbers.

export type LatencyInput = {
    receivedAt?: string
    processingStartedAt?: string
    processedAt?: string
}

export type LatencySummary = {
    count: number
    p50Ms: number | null
    p95Ms: number | null
    meanMs: number | null
    minMs: number | null
    maxMs: number | null
}

function parseMs(value: string | undefined): number | null {
    if (!value) {
        return null
    }
    const t = Date.parse(value)
    return Number.isFinite(t) ? t : null
}

/** Wall-clock milliseconds a document spent being processed (started -> done). */
export function processingLatencyMs(item: LatencyInput): number | null {
    const start = parseMs(item.processingStartedAt)
    const end = parseMs(item.processedAt)
    if (start === null || end === null) {
        return null
    }
    const delta = end - start
    return delta >= 0 ? delta : null
}

/** Wall-clock milliseconds from submission to terminal result (queued -> done). */
export function endToEndLatencyMs(item: LatencyInput): number | null {
    const start = parseMs(item.receivedAt)
    const end = parseMs(item.processedAt)
    if (start === null || end === null) {
        return null
    }
    const delta = end - start
    return delta >= 0 ? delta : null
}

/** Nearest-rank percentile over a numeric sample. Returns null for an empty sample. */
export function percentile(values: number[], p: number): number | null {
    if (values.length === 0) {
        return null
    }
    const sorted = [...values].sort((a, b) => a - b)
    const clamped = Math.min(1, Math.max(0, p))
    const rank = Math.ceil(clamped * sorted.length)
    const index = Math.min(sorted.length - 1, Math.max(0, rank - 1))
    return sorted[index]
}

/** p50 / p95 / mean / min / max over per-document processing latency. */
export function summarizeLatency(items: LatencyInput[]): LatencySummary {
    const samples = items
        .map(processingLatencyMs)
        .filter((value): value is number => value !== null)

    if (samples.length === 0) {
        return { count: 0, p50Ms: null, p95Ms: null, meanMs: null, minMs: null, maxMs: null }
    }

    const sum = samples.reduce((acc, value) => acc + value, 0)
    return {
        count: samples.length,
        p50Ms: percentile(samples, 0.5),
        p95Ms: percentile(samples, 0.95),
        meanMs: Math.round(sum / samples.length),
        // reduce, not Math.min/max(...spread): spreading a large sample array as
        // arguments overflows the call stack (RangeError) once it's big enough.
        minMs: samples.reduce((min, value) => (value < min ? value : min), samples[0]),
        maxMs: samples.reduce((max, value) => (value > max ? value : max), samples[0]),
    }
}
