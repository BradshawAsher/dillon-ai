import { useMemo, useState, useEffect } from 'react'
import { BarChart3, Building2 } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { normalizeEquityFraction, normalizePercentageFraction, DEAL_MATH_DEFAULTS, resolveLoanTermYears, computeAmortizingLoan } from '../utils/dealMath'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import CardInfoPopover from './common/CardInfoPopover'
import { gradeAgainstBenchmark } from '../utils/benchmarkGrade'
import {
    detectSector,
    getSectorProfile,
    SECTOR_LIST,
    type SectorBenchmarkProfile,
} from '../utils/verticalBenchmarks'

type Props = {
    model: DealModel
    synthesis?: any
}

type BenchmarkRow = {
    label: string
    value: number | null
    benchmark: { low: number; median: number; high: number }
    unit: string
    higherIsBetter: boolean
}

export default function BenchmarkComparisonCard({ model, synthesis }: Props) {
    // Auto-detect sector from synthesis industry tag or documented facts
    const autoDetectedSector = useMemo(() => {
        const candidateText = [
            synthesis?.industry,
            (synthesis as any)?.dealName,
            (synthesis as any)?.companyName,
            (model as any)?.industry,
            (model as any)?.companyName,
        ].filter(Boolean).join(' ')
        return detectSector(candidateText)
    }, [synthesis, model])

    const [selectedSectorKey, setSelectedSectorKey] = useState<string>(autoDetectedSector)

    // Sync if deal changes
    useEffect(() => {
        if (autoDetectedSector) {
            setSelectedSectorKey(autoDetectedSector)
        }
    }, [autoDetectedSector])

    const sectorProfile: SectorBenchmarkProfile = useMemo(() => {
        return getSectorProfile(selectedSectorKey)
    }, [selectedSectorKey])

    const rows = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda) return null

        const entryMult = ebitda > 0 ? price / ebitda : null
        const margin = revenue && revenue > 0 ? ebitda / revenue : null

        // Gross Margin calculation if available
        let grossMargin: number | null = null
        if (revenue && revenue > 0) {
            if (typeof facts.gross_profit?.value === 'number') {
                grossMargin = facts.gross_profit.value / revenue
            } else if (typeof facts.cogs?.value === 'number') {
                grossMargin = (revenue - facts.cogs.value) / revenue
            }
        }

        const growth = model.baseRevenueGrowth
        const taxRate = normalizePercentageFraction(model.taxRate) ?? DEAL_MATH_DEFAULTS.taxRate
        const capex = model.maintenanceCapex ?? DEAL_MATH_DEFAULTS.maintenanceCapex
        const annualCF = ebitda * (1 - taxRate) - capex
        const payback = annualCF > 0 ? price / annualCF : null

        const debt = price * (1 - normalizeEquityFraction(model.equityContributionPercent))
        const rate = normalizePercentageFraction(model.interestRate) ?? DEAL_MATH_DEFAULTS.interestRate
        const amortYears = resolveLoanTermYears(model.amortizationYears, model.loanTermYears)
        const monthlyPayment = computeAmortizingLoan(debt, rate, amortYears)?.monthlyPayment ?? 0
        const annualDS = monthlyPayment * 12
        const dscr = annualDS > 0 ? (ebitda * (1 - taxRate)) / annualDS : null

        const bench = sectorProfile.metrics

        const result: BenchmarkRow[] = [
            {
                label: 'Entry Multiple (EV / EBITDA)',
                value: entryMult,
                benchmark: bench.entryMultiple,
                unit: 'x',
                higherIsBetter: false,
            },
        ]

        if (grossMargin !== null) {
            result.push({
                label: 'Gross Profit Margin',
                value: grossMargin,
                benchmark: bench.grossMargin,
                unit: '%',
                higherIsBetter: true,
            })
        }

        result.push(
            {
                label: 'EBITDA Margin',
                value: margin,
                benchmark: bench.ebitdaMargin,
                unit: '%',
                higherIsBetter: true,
            },
            {
                label: 'Revenue Growth',
                value: growth,
                benchmark: bench.revenueGrowth,
                unit: '%',
                higherIsBetter: true,
            },
            {
                label: 'Payback Period',
                value: payback,
                benchmark: bench.paybackYears,
                unit: 'yr',
                higherIsBetter: false,
            },
            {
                label: 'Senior DSCR',
                value: dscr,
                benchmark: bench.dscr,
                unit: 'x',
                higherIsBetter: true,
            }
        )

        return result.filter(r => r.value !== null)
    }, [model, sectorProfile])

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

    const getGrade = gradeAgainstBenchmark

    return (
        <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base font-semibold">Industry Benchmark Comparison</CardTitle>
                        <CardInfoPopover cardId="benchmark-comparison" />
                    </div>

                    <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <select
                            value={selectedSectorKey}
                            onChange={(e) => setSelectedSectorKey(e.target.value)}
                            className="text-xs bg-background border border-border rounded-md px-2.5 py-1 text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                        >
                            {SECTOR_LIST.map((sector) => (
                                <option key={sector.key} value={sector.key}>
                                    {sector.displayName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-1 border-t border-border/40">
                    <p className="text-xs text-muted-foreground">
                        {sectorProfile.description}
                    </p>
                    <Badge variant="outline" className="text-[10px] font-medium border-primary/30 text-primary bg-primary/5">
                        Peer Median: {sectorProfile.metrics.entryMultiple.median.toFixed(1)}x EV • {(sectorProfile.metrics.grossMargin.median * 100).toFixed(0)}% Gross • {(sectorProfile.metrics.ebitdaMargin.median * 100).toFixed(0)}% EBITDA
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
                {rows.map((row, i) => {
                    const grade = getGrade(row)
                    const position = row.value !== null ? getPosition(row.value, row.benchmark) : 50
                    const medianPosition = getPosition(row.benchmark.median, row.benchmark)

                    return (
                        <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-foreground">{row.label}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-foreground">
                                        {row.value !== null ? formatValue(row.value, row.unit) : '—'}
                                    </span>
                                    <span className={`text-[10px] font-semibold ${grade.color}`}>{grade.label}</span>
                                </div>
                            </div>
                            <div className="relative h-4 rounded-full bg-gradient-to-r from-red-100 via-amber-100 to-green-100 dark:from-red-950/40 dark:via-amber-950/40 dark:to-green-950/40 overflow-hidden border border-border/40 shadow-inner">
                                {!row.higherIsBetter && (
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-100 via-amber-100 to-red-100 dark:from-green-950/40 dark:via-amber-950/40 dark:to-red-950/40" />
                                )}
                                <div
                                    className="absolute top-0 bottom-0 w-1 -ml-0.5 bg-foreground rounded-full shadow-xs z-10"
                                    style={{ left: `${medianPosition}%` }}
                                    title={`Peer Median: ${formatValue(row.benchmark.median, row.unit)}`}
                                />
                                <div
                                    className="absolute top-0.5 bottom-0.5 w-3 h-3 rounded-full bg-primary border-2 border-background ring-2 ring-primary/30 shadow-md z-20"
                                    style={{ left: `calc(${position}% - 6px)` }}
                                    title={`This Deal: ${row.value !== null ? formatValue(row.value, row.unit) : 'N/A'}`}
                                />
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-muted-foreground font-mono">
                                <span>25th Pct: {formatValue(row.benchmark.low, row.unit)}</span>
                                <span className="text-foreground font-medium">Median: {formatValue(row.benchmark.median, row.unit)}</span>
                                <span>75th Pct: {formatValue(row.benchmark.high, row.unit)}</span>
                            </div>
                        </div>
                    )
                })}

                <div className="rounded-lg bg-muted/40 p-3 mt-3 border border-border/50">
                    <p className="text-[11px] text-muted-foreground">
                        Benchmarks calibrated against <strong>{sectorProfile.displayName}</strong> M&amp;A transaction records ($1M–$50M EV).
                        The dot marks this deal's position across the 25th–75th percentile band. The vertical line marks the peer median. Green end indicates favorable buyer terms.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
