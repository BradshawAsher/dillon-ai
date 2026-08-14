// Forward-looking processing-time estimates.
//
// The dashboard previously showed manual-review time savings but never told a
// user how long the *automated* pipeline itself is likely to take, so a batch
// that runs for a few minutes felt like it had stalled. These helpers turn a
// document set into a defensible "typical time" estimate the UI can show up
// front, and a formatter for rendering it.
//
// The per-document constants are grounded in observed n8n wall-clock latency
// (extraction + reconciliation, plus the Haiku validation pass). They are
// deliberately conservative — an estimate that reads a little long is far less
// alarming than one that promises a speed the pipeline cannot hit.

/** Typical wall-clock seconds for one document's extraction + analysis pass. */
export const SECONDS_PER_DOCUMENT_BASE = 45
/** Additional seconds per 1,000 characters of parsed document text. */
export const SECONDS_PER_1K_CHARS = 3
/** Typical wall-clock seconds for the project synthesis (one Sonnet pass). */
export const SECONDS_PER_SYNTHESIS = 90

export type ProcessingEstimateInput = {
    /** Number of documents queued in the batch. */
    documentCount: number
    /** Total parsed characters across the batch, when known. */
    totalCharacters?: number
    /** Whether a project synthesis will run after the documents complete. */
    includeSynthesis?: boolean
}

export type ProcessingEstimate = {
    documentSeconds: number
    synthesisSeconds: number
    totalSeconds: number
}

/**
 * Estimates end-to-end processing seconds for a batch. Character count refines
 * the per-document term when available; otherwise the base rate is used.
 */
export function estimateProcessingSeconds(input: ProcessingEstimateInput): ProcessingEstimate {
    const documents = Math.max(0, Math.floor(input.documentCount))
    const perDocCharSeconds = input.totalCharacters && documents > 0
        ? (input.totalCharacters / 1000) * SECONDS_PER_1K_CHARS
        : 0
    const documentSeconds = documents * SECONDS_PER_DOCUMENT_BASE + perDocCharSeconds
    const synthesisSeconds = input.includeSynthesis && documents > 0 ? SECONDS_PER_SYNTHESIS : 0
    return {
        documentSeconds,
        synthesisSeconds,
        totalSeconds: documentSeconds + synthesisSeconds,
    }
}

/** Renders a seconds value as a short human string ("~2 min", "~45 sec"). */
export function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) return '—'
    if (seconds < 90) return `~${Math.round(seconds)} sec`

    // Round to whole minutes up front and derive hours/days from that integer,
    // so a rounding carry propagates cleanly. Rounding each unit independently
    // could surface impossible remainders like "~1 hr 60 min" or "1 day 24 hr"
    // (e.g. 59.7 min rounding to 60, or 23.6 hr rounding to 24).
    const totalMinutes = Math.round(seconds / 60)
    if (totalMinutes < 60) return `~${totalMinutes} min`

    const totalHours = Math.floor(totalMinutes / 60)
    const remMinutes = totalMinutes % 60
    if (totalHours < 24) {
        return remMinutes > 0 ? `~${totalHours} hr ${remMinutes} min` : `~${totalHours} hr`
    }

    // Very large estimates read more naturally in days than a big hour count.
    const days = Math.floor(totalHours / 24)
    const remHours = totalHours % 24
    const dayLabel = `${days} day${days > 1 ? 's' : ''}`
    return remHours > 0 ? `~${dayLabel} ${remHours} hr` : `~${dayLabel}`
}
