// Percentage margin of a current value above (or below) a breakeven threshold:
//   ((current - breakeven) / breakeven) * 100
//
// The breakeven card repeated this expression four times, and each copy divided
// by the raw breakeven value. When breakeven is 0 — e.g. an all-equity deal with
// no debt service and no capex, so the "EBITDA to cover debt service" threshold
// collapses to 0 — the division yielded Infinity and the UI printed
// "Infinity% margin". This helper returns null for a zero or non-finite
// denominator so callers can render a placeholder instead.

export function percentMargin(current: number, breakeven: number): number | null {
    if (!Number.isFinite(current) || !Number.isFinite(breakeven) || breakeven === 0) {
        return null
    }
    return ((current - breakeven) / breakeven) * 100
}
