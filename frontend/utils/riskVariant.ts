// Single source of truth for mapping a risk level to a badge variant.
//
// DealOverviewCard and ProjectSynthesisCard each carried a byte-identical copy
// of this mapping (`riskVariant` / `getRiskVariant`). Two copies is exactly how
// two cards start disagreeing about how the same "high" risk looks — this is the
// one place that decides.

export type RiskBadgeVariant = 'destructive' | 'warning' | 'secondary' | 'outline'

/** critical/high → destructive, medium → warning, low → secondary, else outline. */
export function riskLevelVariant(riskLevel: string | null | undefined): RiskBadgeVariant {
    // A missing risk level should render the neutral 'outline' variant, not throw
    // on `.trim()` — synthesis rows sometimes carry a null/undefined level.
    const normalized = (riskLevel ?? '').trim().toLowerCase()
    if (normalized === 'critical' || normalized === 'high') return 'destructive'
    if (normalized === 'medium') return 'warning'
    if (normalized === 'low') return 'secondary'
    return 'outline'
}
