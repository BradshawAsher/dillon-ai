// Pure benchmark grading: rates a metric against low/median/high band values,
// honouring whether higher or lower is better. Extracted from
// BenchmarkComparisonCard so the banding — and especially the inverted
// lower-is-better direction (entry multiple, payback years) — is unit-tested.

export type BenchmarkBand = { low: number; median: number; high: number }

export type BenchmarkGradeInput = {
    value: number | null
    benchmark: BenchmarkBand
    higherIsBetter: boolean
}

export type BenchmarkGrade = {
    label: 'Excellent' | 'Good' | 'Below avg' | 'Poor' | '—'
    color: string
}

/** Grades `value` against its benchmark band, respecting metric direction. */
export function gradeAgainstBenchmark(row: BenchmarkGradeInput): BenchmarkGrade {
    if (row.value === null) return { label: '—', color: 'text-muted-foreground' }
    const v = row.value
    const b = row.benchmark

    if (row.higherIsBetter) {
        if (v >= b.high) return { label: 'Excellent', color: 'text-green-600' }
        if (v >= b.median) return { label: 'Good', color: 'text-green-600' }
        if (v >= b.low) return { label: 'Below avg', color: 'text-amber-600' }
        return { label: 'Poor', color: 'text-red-600' }
    }
    if (v <= b.low) return { label: 'Excellent', color: 'text-green-600' }
    if (v <= b.median) return { label: 'Good', color: 'text-green-600' }
    if (v <= b.high) return { label: 'Below avg', color: 'text-amber-600' }
    return { label: 'Poor', color: 'text-red-600' }
}
