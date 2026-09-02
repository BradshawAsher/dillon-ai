// Formats a breakeven metric value for display. A 'x' unit (e.g. DSCR, MOIC)
// renders as a two-decimal multiple; every other unit is treated as whole
// dollars with comma grouping. Extracted from BreakevenAnalysisCard so the
// unit-driven branching is testable.

/**
 * @param value the numeric metric value
 * @param unit  'x' for a multiple, anything else for a dollar amount
 */
export function formatBreakevenValue(value: number, unit: string): string {
    if (!Number.isFinite(value)) return unit === 'x' ? '—x' : '—'
    if (unit === 'x') return `${value.toFixed(2)}x`
    return `$${Math.round(value).toLocaleString()}`
}
