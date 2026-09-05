// Shared compact USD formatter.
//
// Several cards had grown their own near-identical "compact" helpers
// ($1.2M / $340K / $500). They disagreed on negatives: one dropped the sign
// test entirely (rendering a negative EBITDA as "$-2500000"), another emitted
// "$-2.5M" with the minus stuck after the dollar sign. This is the single
// place that resolves the format, always placing the sign in front so a loss
// reads as "-$2.5M".

/**
 * Formats a dollar amount compactly:
 *   >= $1M  -> "$1.2M" (one decimal)
 *   >= $1K  -> "$340K" (whole thousands)
 *   else    -> "$500"  (comma-grouped whole dollars)
 * Negatives keep the sign ahead of the dollar sign ("-$2.5M").
 * Non-finite input returns "N/A" rather than a broken "$InfinityM".
 */
export function formatCompactUsd(value: number): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/A'
    const sign = value < 0 ? '-' : ''
    const abs = Math.abs(value)
    // Rounding-aware tier edges: 999.95M+ rounds to "1000.0M" at one decimal,
    // and 999,500+ rounds to "1000K" at zero decimals. Promote those to the
    // next suffix so a headline figure never reads as four-digit mantissa.
    if (abs >= 999_950_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
    if (abs >= 999_500) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
    return `${sign}$${Math.round(abs).toLocaleString()}`
}
