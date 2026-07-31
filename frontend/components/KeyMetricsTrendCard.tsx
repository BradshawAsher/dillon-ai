import { useMemo } from 'react'
import { Activity } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { resolveLoanTermYears } from '../utils/dealMath'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

type MetricProjection = {
    label: string
    current: number
    year3: number
    year5: number
    unit: string
    trend: 'up' | 'flat' | 'down'
}

export default function KeyMetricsTrendCard({ model }: Props) {
    const projections = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda || ebitda <= 0) return null

        const growth = model.baseRevenueGrowth ?? 0.05
        const margin = revenue && revenue > 0 ? ebitda / revenue : (model.baseEbitdaMargin ?? 0.20)
        const baseRevenue = revenue ?? ebitda / margin
        const exitMult = model.exitMultiple ?? 4.0
        const debt = model.seniorDebtAmount ?? 0
        const rate = model.interestRate ?? 0.07
        const term = resolveLoanTermYears(model.amortizationYears, model.loanTermYears)

        const results: MetricProjection[] = []

        results.push({
            label: 'Revenue',
            current: baseRevenue,
            year3: baseRevenue * Math.pow(1 + growth, 3),
            year5: baseRevenue * Math.pow(1 + growth, 5),
            unit: '$',
            trend: growth > 0 ? 'up' : growth === 0 ? 'flat' : 'down',
        })

        results.push({
            label: 'EBITDA',
            current: ebitda,
            year3: baseRevenue * Math.pow(1 + growth, 3) * margin,
            year5: baseRevenue * Math.pow(1 + growth, 5) * margin,
            unit: '$',
            trend: growth > 0 ? 'up' : growth === 0 ? 'flat' : 'down',
        })

        const ev3 = baseRevenue * Math.pow(1 + growth, 3) * margin * exitMult
        const ev5 = baseRevenue * Math.pow(1 + growth, 5) * margin * exitMult
        results.push({
            label: 'Enterprise value',
            current: price,
            year3: ev3,
            year5: ev5,
            unit: '$',
            trend: ev5 > price ? 'up' : 'down',
        })

        if (debt > 0) {
            const monthlyPayment = (debt * (rate / 12)) / (1 - Math.pow(1 + rate / 12, -term * 12))
            const paidAfter3 = Array.from({ length: 36 }).reduce<number>((bal, _, i) => {
                const interest = bal * (rate / 12)
                const principal = monthlyPayment - interest
                return bal - principal
            }, debt)
            const paidAfter5 = Array.from({ length: 60 }).reduce<number>((bal, _, i) => {
                const interest = bal * (rate / 12)
                const principal = monthlyPayment - interest
                return bal - principal
            }, debt)

            results.push({
                label: 'Remaining debt',
                current: debt,
                year3: Math.max(0, paidAfter3),
                year5: Math.max(0, paidAfter5),
                unit: '$',
                trend: 'down',
            })
        }

        const equity = model.equityAmount ?? (price - debt - (model.sellerNoteAmount ?? 0))
        const moic3 = equity > 0 ? ev3 / equity : 0
        const moic5 = equity > 0 ? ev5 / equity : 0
        results.push({
            label: 'Equity MOIC',
            current: 1.0,
            year3: moic3,
            year5: moic5,
            unit: 'x',
            trend: moic5 > 1 ? 'up' : 'down',
        })

        return results
    }, [model])

    if (!projections) return null

    const fmt = (n: number, unit: string) => {
        if (unit === 'x') return `${n.toFixed(1)}x`
        if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
        if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
        return `$${n.toLocaleString()}`
    }

    const trendIcon = (t: string) => t === 'up' ? '↑' : t === 'down' ? '↓' : '→'
    const trendColor = (t: string, label: string) => {
        if (label === 'Remaining debt') return t === 'down' ? 'text-green-600' : 'text-red-600'
        return t === 'up' ? 'text-green-600' : t === 'down' ? 'text-red-600' : 'text-muted-foreground'
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Key metrics trajectory</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Projected evolution of critical deal metrics over the hold period.
                </p>
            </CardHeader>
            <CardContent className="p-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-1.5 text-muted-foreground font-medium">Metric</th>
                                <th className="text-right py-1.5 text-muted-foreground font-medium">Today</th>
                                <th className="text-right py-1.5 text-muted-foreground font-medium">Year 3</th>
                                <th className="text-right py-1.5 text-muted-foreground font-medium">Year 5</th>
                                <th className="text-right py-1.5 text-muted-foreground font-medium w-8">Trend</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projections.map((p, i) => (
                                <tr key={i} className="border-b border-border/50 last:border-0">
                                    <td className="py-2 font-medium text-foreground">{p.label}</td>
                                    <td className="py-2 text-right font-mono text-muted-foreground">{fmt(p.current, p.unit)}</td>
                                    <td className="py-2 text-right font-mono text-foreground">{fmt(p.year3, p.unit)}</td>
                                    <td className="py-2 text-right font-mono font-medium text-foreground">{fmt(p.year5, p.unit)}</td>
                                    <td className={`py-2 text-right font-bold ${trendColor(p.trend, p.label)}`}>{trendIcon(p.trend)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
