import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

type BenchmarkRow = {
    label: string
    value: number | null
    benchmark: { low: number; median: number; high: number }
    unit: string
    higherIsBetter: boolean
}

const SMB_BENCHMARKS = {
    entryMultiple: { low: 2.5, median: 3.5, high: 5.0 },
    ebitdaMargin: { low: 0.10, median: 0.20, high: 0.30 },
    revenueGrowth: { low: 0.02, median: 0.08, high: 0.15 },
    paybackYears: { low: 3, median: 5, high: 8 },
    dscr: { low: 1.1, median: 1.5, high: 2.5 },
}

export default function BenchmarkComparisonCard({ model }: Props) {
    const rows = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda) return null

        const entryMult = ebitda > 0 ? price / ebitda : null
        const margin = revenue && revenue > 0 ? ebitda / revenue : null
        const growth = model.baseRevenueGrowth
        const taxRate = model.taxRate ?? 0.25
        const capex = model.maintenanceCapex ?? 0
        const annualCF = ebitda * (1 - taxRate) - capex
        const payback = annualCF > 0 ? price / annualCF : null

        const equityPct = model.equityContributionPercent ?? 25
        const debt = price * (1 - equityPct / 100)
        const rate = model.interestRate ?? 0.07
        const amortYears = model.amortizationYears ?? 10
        const monthlyRate = rate / 12
        const nPayments = amortYears * 12
        const monthlyPayment = debt > 0 && monthlyRate > 0
            ? debt * (monthlyRate * Math.pow(1 + monthlyRate, nPayments)) / (Math.pow(1 + monthlyRate, nPayments) - 1)
            : 0
        const annualDS = monthlyPayment * 12
        const dscr = annualDS > 0 ? (ebitda * (1 - taxRate)) / annualDS : null

        const result: BenchmarkRow[] = [
            {
                label: 'Entry Multiple',
                value: entryMult,
                benchmark: SMB_BENCHMARKS.entryMultiple,
                unit: 'x',
                higherIsBetter: false,
            },
            {
                label: 'EBITDA Margin',
                value: margin,
                benchmark: SMB_BENCHMARKS.ebitdaMargin,
                unit: '%',
                higherIsBetter: true,
            },
            {
                label: 'Revenue Growth',
                value: growth,
                benchmark: SMB_BENCHMARKS.revenueGrowth,
                unit: '%',
                higherIsBetter: true,
            },
            {
                label: 'Payback Period',
                value: payback,
                benchmark: SMB_BENCHMARKS.paybackYears,
                unit: 'yr',
                higherIsBetter: false,
            },
            {
                label: 'DSCR',
                value: dscr,
                benchmark: SMB_BENCHMARKS.dscr,
                unit: 'x',
                higherIsBetter: true,
            },
        ]

        return result.filter(r => r.value !== null)
    }, [model])

    if (!rows || rows.length === 0) return null

    const formatValue = (value: number, unit: string) => {
        if (unit === '%') return `${(value * 100).toFixed(1)}%`
        if (unit === 'x') return `${value.toFixed(1)}x`
        if (unit === 'yr') return `${value.toFixed(1)}`
        return value.toFixed(1)
    }

    const getPosition = (value: number, bench: { low: number; high: number }) => {
        const range = bench.high - bench.low
        if (range === 0) return 50
        return Math.max(0, Math.min(100, ((value - bench.low) / range) * 100))
    }

    const getGrade = (row: BenchmarkRow): { label: string; color: string } => {
        if (row.value === null) return { label: '—', color: 'text-muted-foreground' }
        const v = row.value
        const b = row.benchmark

        if (row.higherIsBetter) {
            if (v >= b.high) return { label: 'Excellent', color: 'text-green-600' }
            if (v >= b.median) return { label: 'Good', color: 'text-green-600' }
            if (v >= b.low) return { label: 'Below avg', color: 'text-amber-600' }
            return { label: 'Poor', color: 'text-red-600' }
        } else {
            if (v <= b.low) return { label: 'Excellent', color: 'text-green-600' }
            if (v <= b.median) return { label: 'Good', color: 'text-green-600' }
            if (v <= b.high) return { label: 'Below avg', color: 'text-amber-600' }
            return { label: 'Poor', color: 'text-red-600' }
        }
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">SMB benchmark comparison</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    How this deal compares to typical SMB acquisition benchmarks
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {rows.map((row, i) => {
                    const grade = getGrade(row)
                    const position = row.value !== null ? getPosition(row.value, row.benchmark) : 50
                    const medianPosition = getPosition(row.benchmark.median, row.benchmark)

                    return (
                        <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-foreground">{row.label}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-foreground">{row.value !== null ? formatValue(row.value, row.unit) : '—'}</span>
                                    <span className={`text-[9px] font-medium ${grade.color}`}>{grade.label}</span>
                                </div>
                            </div>
                            <div className="relative h-4 rounded-full bg-gradient-to-r from-red-100 via-amber-100 to-green-100 dark:from-red-950/30 dark:via-amber-950/30 dark:to-green-950/30 overflow-hidden">
                                {!row.higherIsBetter && (
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-100 via-amber-100 to-red-100 dark:from-green-950/30 dark:via-amber-950/30 dark:to-red-950/30" />
                                )}
                                <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/40"
                                    style={{ left: `${medianPosition}%` }}
                                    title={`Median: ${formatValue(row.benchmark.median, row.unit)}`}
                                />
                                <div
                                    className="absolute top-0.5 bottom-0.5 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-sm"
                                    style={{ left: `calc(${position}% - 6px)` }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-[8px] text-muted-foreground">
                                <span>{formatValue(row.benchmark.low, row.unit)}</span>
                                <span>median: {formatValue(row.benchmark.median, row.unit)}</span>
                                <span>{formatValue(row.benchmark.high, row.unit)}</span>
                            </div>
                        </div>
                    )
                })}

                <div className="rounded-lg bg-muted/50 p-3 mt-2">
                    <p className="text-[10px] text-muted-foreground">
                        Benchmarks based on typical US SMB acquisitions ($1-50M enterprise value).
                        Dot shows this deal's position on the range. Vertical line marks the median.
                        Green end = better for buyers.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
