import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    model: DealModel
}

type Comp = {
    metric: string
    yourValue: string
    marketLow: string
    marketMedian: string
    marketHigh: string
    position: 'below' | 'at' | 'above'
}

export default function MarketCompsCard({ model }: Props) {
    const comps = useMemo(() => {
        const results: Comp[] = []
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (price && ebitda) {
            const mult = price / ebitda
            results.push({
                metric: 'Entry Multiple',
                yourValue: `${mult.toFixed(1)}x`,
                marketLow: '2.5x',
                marketMedian: '4.0x',
                marketHigh: '6.0x',
                position: mult <= 3.5 ? 'below' : mult <= 5 ? 'at' : 'above',
            })
        }

        if (revenue && ebitda) {
            const margin = (ebitda / revenue) * 100
            results.push({
                metric: 'EBITDA Margin',
                yourValue: `${margin.toFixed(0)}%`,
                marketLow: '10%',
                marketMedian: '20%',
                marketHigh: '35%',
                position: margin <= 14 ? 'below' : margin <= 28 ? 'at' : 'above',
            })
        }

        if (price && revenue) {
            const revMult = price / revenue
            results.push({
                metric: 'Revenue Multiple',
                yourValue: `${revMult.toFixed(2)}x`,
                marketLow: '0.4x',
                marketMedian: '1.0x',
                marketHigh: '2.0x',
                position: revMult <= 0.7 ? 'below' : revMult <= 1.5 ? 'at' : 'above',
            })
        }

        if (price && ebitda) {
            const payback = price / ebitda
            results.push({
                metric: 'Payback Period',
                yourValue: `${payback.toFixed(1)} yrs`,
                marketLow: '2.5 yrs',
                marketMedian: '4.0 yrs',
                marketHigh: '6.0 yrs',
                position: payback <= 3 ? 'below' : payback <= 5 ? 'at' : 'above',
            })
        }

        return results
    }, [model])

    if (comps.length === 0) return null

    const posColor = (p: Comp['position'], metric: string) => {
        const isLowerBetter = metric === 'Entry Multiple' || metric === 'Revenue Multiple' || metric === 'Payback Period'
        if (isLowerBetter) return p === 'below' ? 'text-green-600' : p === 'above' ? 'text-red-600' : 'text-foreground'
        return p === 'above' ? 'text-green-600' : p === 'below' ? 'text-red-600' : 'text-foreground'
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">vs. Market</CardTitle>
                    </div>
                    <Badge variant="outline">SMB $1-10M range</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Metric</th>
                                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Your deal</th>
                                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Low</th>
                                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Median</th>
                                <th className="px-3 py-2 text-right font-medium text-muted-foreground">High</th>
                            </tr>
                        </thead>
                        <tbody>
                            {comps.map(c => (
                                <tr key={c.metric} className="border-b border-border last:border-0">
                                    <td className="px-4 py-2.5 font-medium text-foreground">{c.metric}</td>
                                    <td className={`px-3 py-2.5 text-right font-bold ${posColor(c.position, c.metric)}`}>{c.yourValue}</td>
                                    <td className="px-3 py-2.5 text-right text-muted-foreground">{c.marketLow}</td>
                                    <td className="px-3 py-2.5 text-right text-muted-foreground">{c.marketMedian}</td>
                                    <td className="px-3 py-2.5 text-right text-muted-foreground">{c.marketHigh}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="px-4 py-2 text-[10px] text-muted-foreground border-t border-border">Market ranges based on typical SMB transactions ($1-10M revenue). Actual comparables vary by industry, geography, and growth profile.</p>
            </CardContent>
        </Card>
    )
}
