// Relative "time ago" formatter for the deal timeline.
//
// Extracted from DealTimelineCard so the minute/hour/day banding can be tested
// deterministically: the reference "now" is injectable rather than reading the
// wall clock, which is what made the inline version untestable.

/**
 * Formats a past epoch-millis timestamp as a short relative label:
 *   0            -> "Pending"
 *   < 1 min ago  -> "Just now"
 *   < 60 min ago -> "12m ago"
 *   < 24 h ago   -> "5h ago"
 *   otherwise    -> "3d ago"
 * A future timestamp (now < timestamp) collapses to "Just now".
 */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
    if (timestamp === 0) return 'Pending'
    const diffMin = Math.floor((now - timestamp) / 60_000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
}
