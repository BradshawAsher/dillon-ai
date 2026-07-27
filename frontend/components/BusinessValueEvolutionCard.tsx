import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

export default function BusinessValueEvolutionCard({ model }: Props) {
    const data = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda) return null

        const growthRate = model.baseRevenueGrowth ?? 0.05
        const marginRate = model.baseEbitdaMargin ?? (revenue && ebitda ? ebitda / revenue : 0.20)
        const exitMult = model.exitMultiple ?? 4.0
        const holdYears = model.holdPeriodYears ?? 5

        const futureRevenue = revenue ? revenue * Math.pow(1 + growthRate, holdYears) : null
        const futureEbitda = futureRevenue ? futureRevenue * marginRate : ebitda * Math.pow(1 + growthRate, holdYears)
        const futureValue = futureEbitda * exitMult

        const totalGain = futureValue - price
        const gainPercent = (totalGain / price) * 100
        const annualizedReturn = (Math.pow(futureValue / price, 1 / holdYears) - 1) * 100

        const revenueGrowthPct = revenue && futureRevenue ? ((futureRevenue / revenue) - 1) * 100 : null
        const ebitdaGrowthPct = ((futureEbitda / ebitda) - 1) * 100

        return {
            currentInvestment: price,
            futureValue,
            totalGain,
            gainPercent,
            annualizedReturn,
            holdYears,
            currentRevenue: revenue,
            futureRevenue,
            revenueGrowthPct,
            currentEbitda: ebitda,
            futureEbitda,
            ebitdaGrowthPct,
            exitMult,
            growthRate,
        }
    }, [model])

    if (!data) return null

    const barMax = Math.max(data.currentInvestment, data.futureValue)

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Business value evolution</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                        Your <strong>${data.currentInvestment.toLocaleString()}</strong> investment could be worth
                    </p>
                    <p className="text-2xl font-bold text-primary mt-1">
                        ${Math.round(data.futureValue).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        in {data.holdYears} years, with{' '}
                        <span className={`font-semibold ${data.gainPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.gainPercent >= 0 ? '+' : ''}{data.gainPercent.toFixed(0)}% gain
                        </span>
                        {' '}({data.annualizedReturn.toFixed(1)}% annualized)
                    </p>
                </div>

                <div className="space-y-3">
                    {data.currentRevenue && data.futureRevenue && (
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-foreground">Revenue</span>
                                <span className="text-[10px] text-green-600 font-semibold">+{data.revenueGrowthPct?.toFixed(0)}%</span>
                            </div>
                            <div className="flex gap-2 items-center">
                                <div className="flex-1">
                                    <div className="h-4 rounded-full bg-blue-200 overflow-hidden">
                                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${(data.currentRevenue / Math.max(data.currentRevenue, data.futureRevenue)) * 100}%` }} />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Current: ${data.currentRevenue.toLocaleString()}</p>
                                </div>
                                <span className="text-muted-foreground text-xs">&rarr;</span>
                                <div className="flex-1">
                                    <div className="h-4 rounded-full bg-blue-200 overflow-hidden">
                                        <div className="h-full rounded-full bg-blue-600" style={{ width: '100%' }} />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{data.holdYears}yr: ${Math.round(data.futureRevenue).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-foreground">EBITDA</span>
                            <span className="text-[10px] text-green-600 font-semibold">+{data.ebitdaGrowthPct.toFixed(0)}%</span>
                        </div>
                        <div className="flex gap-2 items-center">
                            <div className="flex-1">
                                <div className="h-4 rounded-full bg-emerald-200 overflow-hidden">
                                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(data.currentEbitda / Math.max(data.currentEbitda, data.futureEbitda)) * 100}%` }} />
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Current: ${data.currentEbitda.toLocaleString()}</p>
                            </div>
                            <span className="text-muted-foreground text-xs">&rarr;</span>
                            <div className="flex-1">
                                <div className="h-4 rounded-full bg-emerald-200 overflow-hidden">
                                    <div className="h-full rounded-full bg-emerald-600" style={{ width: '100%' }} />
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{data.holdYears}yr: ${Math.round(data.futureEbitda).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground">
                        Based on {(data.growthRate * 100).toFixed(0)}% annual revenue growth, {data.exitMult}x exit multiple, and {data.holdYears}-year hold.
                        Edit assumptions in the Deal Model at the bottom of this page.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
