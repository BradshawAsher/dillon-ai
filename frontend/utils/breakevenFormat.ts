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
    // Place the minus sign ahead of the currency symbol ("-$500", not "$-500")
    // so a negative breakeven threshold reads as currency rather than arithmetic.
    const rounded = Math.round(value)
    return rounded < 0 ? `-$${Math.abs(rounded).toLocaleString()}` : `$${rounded.toLocaleString()}`
}
