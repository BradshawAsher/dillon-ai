// Shared "last updated" date formatter. BusinessSnapshotCard and
// DealSummaryBanner each carried an identical copy of this helper; this is the
// single source so the "Sep 1, 2026" label stays consistent across cards.

/**
 * Formats an ISO timestamp as a short, human-readable date ("Sep 1, 2026").
 * Returns null for empty input or an unparseable timestamp so callers can
 * omit the label entirely rather than render "Invalid Date".
 */
export function formatUpdatedDate(value: string | undefined | null): string | null {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
