import { useMemo } from 'react'
import { HeartPulse } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

type Ratio = {
    name: string
    value: string
    status: 'good' | 'warning' | 'bad' | 'neutral'
    benchmark: string
}

export default function FinancialHealthCard({ model }: Props) {
    const ratios = useMemo(() => {
        const results: Ratio[] = []
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const grossProfit = typeof facts.gross_profit?.value === 'number' ? facts.gross_profit.value : null
        const totalDebt = typeof facts.total_debt?.value === 'number' ? facts.total_debt.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (revenue && ebitda) {
            const margin = (ebitda / revenue) * 100
            results.push({
                name: 'EBITDA Margin',
                value: `${margin.toFixed(1)}%`,
                status: margin >= 25 ? 'good' : margin >= 15 ? 'neutral' : 'bad',
                benchmark: 'SMB avg: 15-25%',
            })
        }

        if (revenue && grossProfit) {
            const gpMargin = (grossProfit / revenue) * 100
            results.push({
                name: 'Gross Margin',
                value: `${gpMargin.toFixed(1)}%`,
                status: gpMargin >= 50 ? 'good' : gpMargin >= 30 ? 'neutral' : 'bad',
                benchmark: 'Service: 50%+, Product: 30%+',
            })
        }

        if (totalDebt && ebitda) {
            const leverage = totalDebt / ebitda
            results.push({
                name: 'Debt/EBITDA',
                value: `${leverage.toFixed(1)}x`,
                status: leverage <= 2 ? 'good' : leverage <= 3.5 ? 'warning' : 'bad',
                benchmark: 'Healthy: <3x',
            })
        }

        if (price && ebitda) {
            const multiple = price / ebitda
            results.push({
                name: 'Entry Multiple',
                value: `${multiple.toFixed(1)}x`,
                status: multiple <= 3.5 ? 'good' : multiple <= 5 ? 'neutral' : 'bad',
                benchmark: 'SMB: 3-5x typical',
            })
        }

        if (price && revenue) {
            const revMult = price / revenue
            results.push({
                name: 'Price/Revenue',
                value: `${revMult.toFixed(2)}x`,
                status: revMult <= 1 ? 'good' : revMult <= 2 ? 'neutral' : 'bad',
                benchmark: 'SMB: 0.5-2x typical',
            })
        }

        if (ebitda && model.holdPeriodYears) {
            const payback = (price ?? 0) / ebitda
            if (price) {
                results.push({
                    name: 'Payback Period',
                    value: `${payback.toFixed(1)} yrs`,
                    status: payback <= 3 ? 'good' : payback <= 5 ? 'neutral' : 'bad',
                    benchmark: `Target: <${model.holdPeriodYears} yr hold`,
                })
            }
        }

        return results
    }, [model])

    if (ratios.length === 0) return null

    const statusDot = (s: Ratio['status']) => {
        if (s === 'good') return 'bg-green-500'
        if (s === 'warning') return 'bg-amber-500'
        if (s === 'bad') return 'bg-red-500'
        return 'bg-muted-foreground/50'
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <HeartPulse className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Financial health</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {ratios.map(r => (
                        <div key={r.name} className="rounded-lg border border-border bg-background p-3">
                            <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${statusDot(r.status)}`} />
                                <p className="text-xs font-medium text-muted-foreground">{r.name}</p>
                            </div>
                            <p className="mt-1 text-lg font-semibold text-foreground">{r.value}</p>
                            <p className="text-[10px] text-muted-foreground">{r.benchmark}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
