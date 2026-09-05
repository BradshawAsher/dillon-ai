// Normalizes an AI confidence value into a percentage label.
//
// The pipeline is inconsistent about scale: some models emit a whole percent
// ("87") and others a fraction ("0.82"). This helper accepts either and always
// renders a rounded percent ("87%"), returning null when there is nothing
// usable so the caller can hide the label rather than show "NaN%".

/**
 * @param raw confidence as a string: a whole percent ("87") or a fraction ("0.82").
 * Values <= 1 are treated as fractions and scaled by 100; values > 1 pass through.
 */
export function formatConfidencePercent(raw: string | undefined | null): string | null {
    if (!raw) return null
    const num = Number(raw)
    if (!Number.isFinite(num)) return null
    const pct = num <= 1 ? num * 100 : num
    // A confidence is a probability: clamp to [0, 100] so bad upstream data —
    // a fraction above 1 ("1.5"), a percent above 100 ("150"), or a negative
    // value — can never render an impossible "150%" or "-40%" label.
    const clamped = Math.min(100, Math.max(0, pct))
    return `${Math.round(clamped)}%`
}
