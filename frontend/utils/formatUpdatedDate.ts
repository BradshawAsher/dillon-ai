// Shared "last updated" date formatter. BusinessSnapshotCard and
// DealSummaryBanner each carried an identical copy of this helper; this is the
// single source so the "Sep 1, 2026" label stays consistent across cards.

/**
 * Formats an ISO timestamp as a short, human-readable date ("Sep 1, 2026").
 * Returns null for empty input or an unparseable timestamp so callers can
 * omit the label entirely rather than render "Invalid Date".
 *
 * n8n rows sometimes hand back a numeric epoch (seconds or milliseconds)
 * rather than an ISO string. Accept that so a real "updated at" never
 * disappears just because the type was a number.
 */
export function formatUpdatedDate(value: string | number | undefined | null): string | null {
    if (value === undefined || value === null || value === '') return null

    let timestamp: number
    if (typeof value === 'number') {
        if (!Number.isFinite(value) || value < 1e9) return null
        // 10-digit values are unix seconds; 13-digit values are milliseconds.
        // Reject anything below 1e9 (Sept 2001) so a bare year like 2026
        // cannot render as "Jan 1, 1970".
        timestamp = value < 1e12 ? value * 1000 : value
    } else {
        const trimmed = value.trim()
        if (!trimmed) return null
        const isAllDigits = /^\d+$/.test(trimmed)
        if (isAllDigits) {
            // Require a realistic epoch length so a bare year like "2026"
            // is not read as 1970-era seconds.
            if (trimmed.length < 10) return null
            const numeric = Number(trimmed)
            timestamp = trimmed.length === 10 ? numeric * 1000 : numeric
        } else {
            timestamp = Date.parse(trimmed)
        }
    }

    if (!Number.isFinite(timestamp)) return null
    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
