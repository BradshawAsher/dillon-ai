// Pure customer-concentration risk classification.
//
// This lived inline in CustomerConcentrationCard where it could not be tested
// without rendering the card. The thresholds (>40% = high, >20% = moderate)
// encode a real diligence rule of thumb, so they are worth pinning in a unit
// test rather than leaving to visual inspection.

export type ConcentrationRiskInput = {
    /** Fraction of revenue from one customer, 0..1. Null when unknown. */
    revenueShare?: number | null
    severity?: string
}

export type ConcentrationRisk = {
    label: string
    variant: 'destructive' | 'warning' | 'success'
}

/**
 * Classifies overall customer-concentration risk from the per-customer findings:
 * a single customer above 40% of revenue (or any finding already marked
 * critical) is high risk; above 20% (or any finding at all) is moderate;
 * otherwise the base is considered diversified.
 */
export function getConcentrationRisk(findings: ConcentrationRiskInput[]): ConcentrationRisk {
    // reduce, not Math.max(...spread): a fragmented customer base can carry
    // hundreds of per-customer findings, and spreading that many arguments can
    // overflow the call stack — the same guard latencyMetrics uses.
    //
    // Only finite shares count: a NaN slips past `?? 0` (nullish coalescing does
    // not catch NaN) and would make maxShare NaN, so every `NaN > threshold`
    // comparison is false and a genuinely concentrated base reads as diversified.
    const maxShare = findings.reduce(
        (max, f) => (typeof f.revenueShare === 'number' && Number.isFinite(f.revenueShare) && f.revenueShare > max ? f.revenueShare : max),
        0,
    )
    const hasCritical = findings.some((f) => (f.severity ?? '').trim().toLowerCase() === 'critical')
    if (maxShare > 0.4 || hasCritical) return { label: 'High concentration risk', variant: 'destructive' }
    if (maxShare > 0.2 || findings.length > 0) return { label: 'Moderate concentration', variant: 'warning' }
    return { label: 'Diversified', variant: 'success' }
}
