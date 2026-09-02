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
    return `${Math.round(pct)}%`
}
