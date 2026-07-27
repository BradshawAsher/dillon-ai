import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

export default function PaybackTimelineCard({ model }: Props) {
    const data = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda || ebitda <= 0) return null

        const taxRate = model.taxRate ?? 0.25
        const capex = model.maintenanceCapex ?? 0
        const transactionFees = model.transactionFees ?? 0
        const workingCapital = model.workingCapitalRequirement ?? 0
        const totalInvestment = price + transactionFees + workingCapital
        const growth = model.baseRevenueGrowth ?? 0.05

        const annualCashFlowBase = ebitda * (1 - taxRate) - capex
        if (annualCashFlowBase <= 0) return null

        const years: { year: number; cashFlow: number; cumulative: number }[] = []
        let cumulative = -totalInvestment
        let paybackYear: number | null = null

        for (let y = 1; y <= 10; y++) {
            const annualCashFlow = annualCashFlowBase * Math.pow(1 + growth, y - 1)
            cumulative += annualCashFlow
            years.push({ year: y, cashFlow: annualCashFlow, cumulative })
            if (paybackYear === null && cumulative >= 0) {
                paybackYear = y
            }
        }

        const maxAbsCumulative = Math.max(totalInvestment, Math.abs(years[years.length - 1].cumulative))

        return { years, totalInvestment, paybackYear, maxAbsCumulative, annualCashFlowBase }
    }, [model])

    if (!data) return null

    const chartHeight = 120

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Payback timeline</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Cumulative cash flow over 10 years (with {((model.baseRevenueGrowth ?? 0.05) * 100).toFixed(0)}% annual growth)
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                <div className="relative" style={{ height: `${chartHeight}px` }}>
                    <div className="absolute left-0 right-0 border-t border-dashed border-muted-foreground/30" style={{ top: '50%' }} />
                    <span className="absolute left-0 text-[9px] text-muted-foreground" style={{ top: 'calc(50% - 12px)' }}>$0</span>

                    <div className="absolute inset-0 flex items-end gap-1 px-6">
                        {data.years.map((yr, i) => {
                            const normalized = yr.cumulative / data.maxAbsCumulative
                            const barHeight = Math.abs(normalized) * (chartHeight / 2 - 4)
                            const isPositive = yr.cumulative >= 0

                            return (
                                <div
                                    key={i}
                                    className="flex-1 flex flex-col items-center justify-end relative"
                                    style={{ height: `${chartHeight}px` }}
                                >
                                    {isPositive ? (
                                        <div
                                            className={`w-full rounded-t-sm transition-all ${data.paybackYear === yr.year ? 'bg-green-500' : 'bg-green-400/70'}`}
                                            style={{ height: `${barHeight}px`, position: 'absolute', bottom: '50%' }}
                                        />
                                    ) : (
                                        <div
                                            className="w-full rounded-b-sm bg-red-400/70 transition-all"
                                            style={{ height: `${barHeight}px`, position: 'absolute', top: '50%' }}
                                        />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="flex justify-between px-6 text-[9px] text-muted-foreground">
                    {data.years.map((yr, i) => (
                        <span key={i} className="flex-1 text-center">Y{yr.year}</span>
                    ))}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                    <div className="rounded-lg border border-border p-2">
                        <p className="text-[10px] text-muted-foreground">Total investment</p>
                        <p className="text-sm font-bold text-foreground">${Math.round(data.totalInvestment).toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border border-border p-2">
                        <p className="text-[10px] text-muted-foreground">Payback year</p>
                        <p className={`text-sm font-bold ${data.paybackYear && data.paybackYear <= 5 ? 'text-green-600' : data.paybackYear && data.paybackYear <= 7 ? 'text-amber-600' : 'text-red-600'}`}>
                            {data.paybackYear ? `Year ${data.paybackYear}` : '10+'}
                        </p>
                    </div>
                    <div className="rounded-lg border border-border p-2">
                        <p className="text-[10px] text-muted-foreground">Year 10 value</p>
                        <p className="text-sm font-bold text-green-600">
                            ${Math.round(data.years[data.years.length - 1].cumulative).toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground">
                        Shows cumulative after-tax cash flow minus total investment. Green bars = net positive
                        (payback achieved). Assumes {((model.baseRevenueGrowth ?? 0.05) * 100).toFixed(0)}% annual revenue growth with constant margins.
                        Does not include exit proceeds.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
