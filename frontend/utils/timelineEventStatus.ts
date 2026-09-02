// Maps a raw document/submission status string onto the four timeline states
// the deal timeline renders. Extracted from DealTimelineCard so the synonym
// buckets (what counts as "processing" vs "failed") are covered by tests and
// can be reused wherever a document status needs the same normalization.

export type TimelineEventStatus = 'completed' | 'processing' | 'failed' | 'pending'

const FAILED = new Set(['failed', 'error', 'rejected'])
const PROCESSING = new Set(['processing', 'running', 'queued', 'submitted', 'accepted'])

/**
 * Normalizes (trim + lowercase) and buckets a raw status. Unknown statuses fall
 * back to 'pending' so the timeline never shows an unstyled state.
 */
export function classifyTimelineEventStatus(rawStatus: string | undefined | null): TimelineEventStatus {
    const status = (rawStatus || '').trim().toLowerCase()
    if (status === 'completed') return 'completed'
    if (FAILED.has(status)) return 'failed'
    if (PROCESSING.has(status)) return 'processing'
    return 'pending'
}
