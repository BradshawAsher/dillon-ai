// Pure badge-variant classifiers for the Deal Health KPI strip.
//
// These traffic-light / threshold mappings were inline in DealHealthKPIs, where
// a mislabeled risk signal (green styling on a red deal) could only be caught by
// eye. Pinning them here keeps the colour a KPI shows tied to a tested rule.

export type KpiVariant = 'success' | 'warning' | 'destructive' | 'default'

/**
 * Maps a synthesis traffic light / risk level to a KPI badge variant. Red or
 * critical/high risk is destructive; yellow or medium is a warning; anything
 * else (including green) is treated as healthy.
 */
export function riskSignalVariant(trafficLight?: string | null, riskLevel?: string | null): KpiVariant {
    const light = (trafficLight ?? '').trim().toLowerCase()
    const level = (riskLevel ?? '').trim().toLowerCase()
    if (light === 'red' || level === 'red' || level === 'critical' || level === 'high') {
        return 'destructive'
    }
    if (light === 'yellow' || level === 'yellow' || level === 'medium') {
        return 'warning'
    }
    return 'success'
}

/**
 * Buckets an entry multiple (price / EBITDA) into a badge variant: above 12x is
 * expensive (destructive), above 7x warrants a warning, at or below is healthy.
 */
export function entryMultipleVariant(multiple: number): KpiVariant {
    if (multiple > 12) return 'destructive'
    if (multiple > 7) return 'warning'
    return 'success'
}
