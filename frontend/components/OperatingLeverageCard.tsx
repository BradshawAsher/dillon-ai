import { useMemo } from 'react'
import { Gauge } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

export default function OperatingLeverageCard({ model }: Props) {
    const data = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const grossProfit = typeof facts.gross_profit?.value === 'number' ? facts.gross_profit.value : null
        const cogs = typeof facts.cogs?.value === 'number' ? facts.cogs.value : null

        if (!revenue || !ebitda || revenue <= 0 || ebitda <= 0) return null

        const margin = ebitda / revenue
        const grossMargin = grossProfit ? grossProfit / revenue : (cogs ? (revenue - cogs) / revenue : null)
        const opex = grossProfit ? grossProfit - ebitda : revenue - ebitda
        const fixedCostRatio = opex / revenue

        const scenarios = [5, 10, 15, 20].map(revIncrease => {
            const newRevenue = revenue * (1 + revIncrease / 100)
            const variableCosts = cogs ? cogs * (1 + revIncrease / 100) : revenue * (1 - (grossMargin ?? 0.5)) * (1 + revIncrease / 100)
            const newGrossProfit = newRevenue - variableCosts
            const newEbitda = newGrossProfit - opex
            const ebitdaIncrease = ((newEbitda - ebitda) / ebitda) * 100
            const leverageRatio = ebitdaIncrease / revIncrease

            return {
                revIncrease,
                ebitdaIncrease: Math.round(ebitdaIncrease),
                leverageRatio: leverageRatio.toFixed(1),
                newEbitda: Math.round(newEbitda),
            }
        })

        const degreeOfLeverage = scenarios[0] ? parseFloat(scenarios[0].leverageRatio) : 1.0
        const leverageLevel = degreeOfLeverage >= 3 ? 'High' : degreeOfLeverage >= 1.5 ? 'Moderate' : 'Low'
        const leverageColor = degreeOfLeverage >= 3 ? 'text-purple-600' : degreeOfLeverage >= 1.5 ? 'text-blue-600' : 'text-green-600'

        return {
            margin: (margin * 100).toFixed(0),
            grossMargin: grossMargin ? (grossMargin * 100).toFixed(0) : null,
            fixedCostRatio: (fixedCostRatio * 100).toFixed(0),
            degreeOfLeverage: degreeOfLeverage.toFixed(1),
            leverageLevel,
            leverageColor,
            scenarios,
        }
    }, [model])

    if (!data) return null

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Operating leverage</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    How much does EBITDA grow for each dollar of revenue growth?
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-[10px] text-muted-foreground">Degree of leverage</p>
                        <p className={`text-sm font-bold ${data.leverageColor}`}>{data.degreeOfLeverage}x</p>
                        <p className={`text-[9px] ${data.leverageColor}`}>{data.leverageLevel}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-[10px] text-muted-foreground">EBITDA margin</p>
                        <p className="text-sm font-bold text-foreground">{data.margin}%</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-[10px] text-muted-foreground">Fixed cost ratio</p>
                        <p className="text-sm font-bold text-foreground">{data.fixedCostRatio}%</p>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                        <span className="w-16">Rev growth</span>
                        <span className="flex-1">EBITDA impact</span>
                        <span className="w-12 text-right">Leverage</span>
                    </div>
                    {data.scenarios.map(s => (
                        <div key={s.revIncrease} className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground w-16">+{s.revIncrease}% rev</span>
                            <div className="flex-1 flex items-center gap-1.5">
                                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-primary/70"
                                        style={{ width: `${Math.min(100, (s.ebitdaIncrease / 80) * 100)}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-mono text-green-600 w-12">+{s.ebitdaIncrease}%</span>
                            </div>
                            <span className="text-[10px] font-mono font-medium text-foreground w-12 text-right">{s.leverageRatio}x</span>
                        </div>
                    ))}
                </div>

                <div className="rounded-lg bg-muted/50 p-2.5 text-[10px] text-muted-foreground">
                    {parseFloat(data.degreeOfLeverage) >= 2
                        ? 'High operating leverage means revenue growth amplifies into outsized EBITDA gains — but revenue declines also amplify losses.'
                        : 'Moderate leverage means EBITDA grows roughly in line with revenue — predictable but limited upside from scale.'}
                </div>
            </CardContent>
        </Card>
    )
}
