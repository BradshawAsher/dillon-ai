// Pure colour mapping for the small risk-level status dot used in comparison
// views. Extracted from ProjectComparisonCard so the level→colour rule is tested
// once and the JSX in the card just applies the returned class.

/** Tailwind background class for a risk-level indicator dot. */
export function riskDotClass(level: string | undefined): string {
    const normalized = (level ?? '').trim().toLowerCase()
    if (normalized === 'high' || normalized === 'critical') return 'bg-destructive'
    if (normalized === 'medium') return 'bg-amber-500'
    if (normalized === 'low') return 'bg-emerald-500'
    return 'bg-muted-foreground/40'
}
