import { useMemo } from 'react'
import { Target } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { normalizeEquityFraction, normalizePercentageFraction, DEAL_MATH_DEFAULTS, resolveLoanTermYears, computeAmortizingLoan } from '../utils/dealMath'
import { formatBreakevenValue } from '../utils/breakevenFormat'
import { percentMargin } from '../utils/percentMargin'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model: DealModel
}

type BreakevenMetric = {
    label: string
    currentValue: number
    breakevenValue: number
    margin: number | null
    unit: string
    isAbove: boolean
}

export default function BreakevenAnalysisCard({ model }: Props) {
    const metrics = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda || ebitda <= 0) return null

        const taxRate = normalizePercentageFraction(model.taxRate) ?? DEAL_MATH_DEFAULTS.taxRate
        const capex = model.maintenanceCapex ?? DEAL_MATH_DEFAULTS.maintenanceCapex
        const equity = price * normalizeEquityFraction(model.equityContributionPercent)
        const debt = price - equity - (model.sellerNoteAmount ?? 0)
        const rate = normalizePercentageFraction(model.interestRate) ?? DEAL_MATH_DEFAULTS.interestRate
        const amortYears = resolveLoanTermYears(model.amortizationYears, model.loanTermYears)

        const monthlyPayment = computeAmortizingLoan(Math.max(0, debt), rate, amortYears)?.monthlyPayment ?? 0
        const annualDebtService = monthlyPayment * 12

        const breakEbitda = (annualDebtService + capex) / (1 - taxRate)
        const ebitdaMargin = revenue && revenue > 0 ? ebitda / revenue : 0.20
        const breakRevenue = ebitdaMargin > 0 ? breakEbitda / ebitdaMargin : null

        const holdYears = model.holdPeriodYears ?? 5
        const exitMult = model.exitMultiple ?? (price / ebitda)
        const totalInvestment = price + (model.transactionFees ?? 0) + (model.workingCapitalRequirement ?? 0)
        const breakExitEbitda = totalInvestment / exitMult

        const result: BreakevenMetric[] = []

        result.push({
            label: 'EBITDA to cover debt service',
            currentValue: ebitda,
            breakevenValue: breakEbitda,
            margin: percentMargin(ebitda, breakEbitda),
            unit: '$',
            isAbove: ebitda >= breakEbitda,
        })

        if (breakRevenue && revenue) {
            result.push({
                label: 'Revenue to cover debt service',
                currentValue: revenue,
                breakevenValue: breakRevenue,
                margin: percentMargin(revenue, breakRevenue),
                unit: '$',
                isAbove: revenue >= breakRevenue,
            })
        }

        result.push({
            label: 'Exit EBITDA for 1x MOIC',
            currentValue: ebitda,
            breakevenValue: breakExitEbitda,
            margin: percentMargin(ebitda, breakExitEbitda),
            unit: '$',
            isAbove: ebitda >= breakExitEbitda,
        })

        const dscr = ebitda * (1 - taxRate) / (annualDebtService || 1)
        result.push({
            label: 'Debt service coverage (DSCR)',
            currentValue: dscr,
            breakevenValue: 1.0,
            margin: percentMargin(dscr, 1.0),
            unit: 'x',
            isAbove: dscr >= 1.0,
        })

        return result
    }, [model])

    if (!metrics) return null

    const formatValue = formatBreakevenValue

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <CardTitle className="text-lg">Breakeven analysis</CardTitle>
                        <CardInfoPopover cardId="breakeven-analysis" />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Minimum performance needed to cover obligations
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {metrics.map((metric, i) => {
                    const barWidth = metric.unit === 'x'
                        ? Math.min(100, (metric.currentValue / Math.max(metric.breakevenValue * 2, metric.currentValue * 1.2)) * 100)
                        : Math.min(100, (metric.currentValue / Math.max(metric.breakevenValue * 2, metric.currentValue * 1.2)) * 100)
                    const thresholdPosition = metric.unit === 'x'
                        ? Math.min(100, (metric.breakevenValue / Math.max(metric.breakevenValue * 2, metric.currentValue * 1.2)) * 100)
                        : Math.min(100, (metric.breakevenValue / Math.max(metric.breakevenValue * 2, metric.currentValue * 1.2)) * 100)

                    return (
                        <div key={i} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-foreground">{metric.label}</span>
                                <span className={`text-[10px] font-bold ${metric.isAbove ? 'text-green-600' : 'text-red-600'}`}>
                                    {metric.margin === null
                                        ? '— margin'
                                        : `${metric.margin > 0 ? '+' : ''}${metric.margin.toFixed(0)}% margin`}
                                </span>
                            </div>
                            <div className="relative h-5 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${metric.isAbove ? 'bg-green-400' : 'bg-red-400'}`}
                                    style={{ width: `${barWidth}%` }}
                                />
                                <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-foreground/70"
                                    style={{ left: `${thresholdPosition}%` }}
                                    title={`Breakeven: ${formatValue(metric.breakevenValue, metric.unit)}`}
                                />
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                                <span>Current: <span className="font-medium text-foreground">{formatValue(metric.currentValue, metric.unit)}</span></span>
                                <span>Breakeven: <span className="font-medium text-foreground">{formatValue(metric.breakevenValue, metric.unit)}</span></span>
                            </div>
                        </div>
                    )
                })}

                <div className="rounded-lg bg-muted/50 p-3 mt-2">
                    <p className="text-[10px] text-muted-foreground">
                        The vertical line marks the breakeven threshold. Green bars mean the business currently
                        exceeds the requirement; red means it falls short. Higher margins above breakeven indicate
                        greater downside protection.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
