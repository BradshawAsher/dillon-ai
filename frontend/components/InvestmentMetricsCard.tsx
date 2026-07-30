import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    model: DealModel
}

function money(val: number): string {
    if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
    if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
    return `$${val.toFixed(0)}`
}

function computeIRR(cashFlows: number[]): number | null {
    let rate = 0.1
    for (let iter = 0; iter < 100; iter++) {
        let npv = 0
        let dnpv = 0
        for (let t = 0; t < cashFlows.length; t++) {
            const factor = Math.pow(1 + rate, t)
            npv += cashFlows[t] / factor
            if (t > 0) dnpv -= t * cashFlows[t] / Math.pow(1 + rate, t + 1)
        }
        if (Math.abs(npv) < 0.01) return rate
        if (dnpv === 0) break
        rate -= npv / dnpv
        if (rate < -0.99 || rate > 10) break
    }
    return null
}

type MetricItem = {
    label: string
    value: string
    sublabel: string
    status: 'positive' | 'negative' | 'neutral'
}

export default function InvestmentMetricsCard({ model }: Props) {
    const metrics = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const price = model.purchasePrice ?? model.askingPrice
        if (!ebitda || !price || ebitda <= 0) return null

        const holdYears = model.holdPeriodYears ?? 5
        const exitMult = model.exitMultiple ?? (price / ebitda)
        const growthRate = model.baseRevenueGrowth ?? 0.05
        const marginRate = model.baseEbitdaMargin ?? (ebitda / (typeof facts.revenue?.value === 'number' ? facts.revenue.value : ebitda * 3))
        const taxRate = model.taxRate ?? 0.25

        const annualCash = ebitda * (1 - taxRate)
        const totalCashFlow = annualCash * holdYears
        const exitEbitda = ebitda * Math.pow(1 + growthRate, holdYears)
        const terminalValue = exitEbitda * exitMult
        const totalReturn = totalCashFlow + terminalValue - price

        const cashFlows = [-price]
        for (let y = 1; y <= holdYears; y++) {
            const yearEbitda = ebitda * Math.pow(1 + growthRate, y)
            const yearCash = yearEbitda * (1 - taxRate)
            if (y === holdYears) {
                cashFlows.push(yearCash + exitEbitda * exitMult)
            } else {
                cashFlows.push(yearCash)
            }
        }

        const irr = computeIRR(cashFlows)
        const totalROI = ((totalReturn) / price) * 100
        const cashFlowMult = (totalCashFlow + terminalValue) / price

        const items: MetricItem[] = []

        items.push({
            label: 'IRR',
            value: irr != null ? `${(irr * 100).toFixed(1)}%` : 'N/A',
            sublabel: `${holdYears}-year hold · ${exitMult.toFixed(1)}x exit`,
            status: irr != null && irr >= 0.15 ? 'positive' : irr != null && irr >= 0 ? 'neutral' : 'negative',
        })

        items.push({
            label: `Total ${holdYears}-Year Cash Flow`,
            value: money(totalCashFlow),
            sublabel: 'Before terminal value',
            status: totalCashFlow > 0 ? 'positive' : 'negative',
        })

        items.push({
            label: `${holdYears}-Year Total ROI`,
            value: `${totalROI.toFixed(0)}%`,
            sublabel: 'On initial investment',
            status: totalROI >= 50 ? 'positive' : totalROI >= 0 ? 'neutral' : 'negative',
        })

        items.push({
            label: 'Cash Flow Multiple',
            value: `${cashFlowMult.toFixed(2)}x`,
            sublabel: 'Return on invested capital',
            status: cashFlowMult >= 2 ? 'positive' : cashFlowMult >= 1 ? 'neutral' : 'negative',
        })

        return items
    }, [model])

    if (!metrics) return null

    const statusColor = (s: MetricItem['status']) =>
        s === 'positive' ? 'text-green-600 dark:text-green-400' :
            s === 'negative' ? 'text-red-600 dark:text-red-400' : 'text-foreground'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Investment metrics</CardTitle>
                    </div>
                    <Badge variant="outline">
                        {model.holdPeriodYears ?? 5}yr · {((model.exitMultiple ?? 4).toFixed(1))}x exit
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="mb-3 rounded-lg border border-border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                    <p><strong>IRR</strong> is the annualized return implied by the full cash-flow stream.</p>
                    <p><strong>Cash Flow Multiple / MOIC-style multiple</strong> is total cash back divided by cash invested.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {metrics.map(m => (
                        <div key={m.label} className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                            <p className={`text-xl font-bold ${statusColor(m.status)}`}>{m.value}</p>
                            <p className="mt-1 text-[11px] font-medium text-foreground">{m.label}</p>
                            <p className="mt-0.5 text-[9px] text-muted-foreground">{m.sublabel}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
