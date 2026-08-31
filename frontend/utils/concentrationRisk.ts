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
    const maxShare = Math.max(...findings.map((f) => f.revenueShare ?? 0), 0)
    const hasCritical = findings.some((f) => f.severity === 'critical')
    if (maxShare > 0.4 || hasCritical) return { label: 'High concentration risk', variant: 'destructive' }
    if (maxShare > 0.2 || findings.length > 0) return { label: 'Moderate concentration', variant: 'warning' }
    return { label: 'Diversified', variant: 'success' }
}
