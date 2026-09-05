// Normalizes an AI confidence value into a percentage label.
//
// The pipeline is inconsistent about scale: some models emit a whole percent
// ("87") and others a fraction ("0.82"). This helper accepts either and always
// renders a rounded percent ("87%"), returning null when there is nothing
// usable so the caller can hide the label rather than show "NaN%".

/**
 * @param raw confidence as a whole percent ("87" / 87), a fraction ("0.82" / 0.82),
 * or a percent-sign string ("87%", "1%"). Values <= 1 without a `%` are treated
 * as fractions and scaled by 100; an explicit `%` is honored so "1%" stays 1%.
 */
export function formatConfidencePercent(raw: string | number | undefined | null): string | null {
    if (raw === undefined || raw === null || raw === '') return null
    if (typeof raw === 'number') {
        if (!Number.isFinite(raw)) return null
        const pct = raw <= 1 ? raw * 100 : raw
        const clamped = Math.min(100, Math.max(0, pct))
        return `${Math.round(clamped)}%`
    }
    const str = raw.trim()
    if (!str) return null
    const hasPercentSign = str.includes('%')
    const num = Number(str.replace('%', '').trim())
    if (!Number.isFinite(num)) return null
    // The "<= 1 is a fraction" heuristic only applies to a bare number like
    // 0.87. A value already written with a percent sign ("1%") is in percentage
    // units, so scaling it up to "100%" would be wrong — honor the sign.
    const pct = num <= 1 && !hasPercentSign ? num * 100 : num
    // A confidence is a probability: clamp to [0, 100] so bad upstream data —
    // a fraction above 1 ("1.5"), a percent above 100 ("150"), or a negative
    // value — can never render an impossible "150%" or "-40%" label.
    const clamped = Math.min(100, Math.max(0, pct))
    return `${Math.round(clamped)}%`
}
