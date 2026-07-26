import { useMemo } from 'react'
import { Calculator } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
}

function money(value: number) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
}

type ValMethod = {
    name: string
    low: number
    mid: number
    high: number
    basis: string
}

export default function QuickValuationCard({ model, synthesis }: Props) {
    const methods = useMemo(() => {
        const results: ValMethod[] = []
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null

        if (ebitda) {
            results.push({
                name: 'EBITDA multiple',
                low: ebitda * 3,
                mid: ebitda * 4,
                high: ebitda * 5.5,
                basis: `${money(ebitda)} × 3-5.5x`,
            })
        }

        if (revenue) {
            results.push({
                name: 'Revenue multiple',
                low: revenue * 0.5,
                mid: revenue * 1.0,
                high: revenue * 1.5,
                basis: `${money(revenue)} × 0.5-1.5x`,
            })
        }

        if (ebitda && model.holdPeriodYears && model.baseRevenueGrowth != null) {
            const futureEbitda = ebitda * Math.pow(1 + model.baseRevenueGrowth, model.holdPeriodYears)
            const exitMult = model.exitMultiple ?? 4
            results.push({
                name: 'DCF-lite (exit value)',
                low: futureEbitda * (exitMult - 1),
                mid: futureEbitda * exitMult,
                high: futureEbitda * (exitMult + 1),
                basis: `${model.holdPeriodYears}yr growth → exit at ${exitMult}x`,
            })
        }

        return results
    }, [model])

    if (methods.length === 0) return null

    const price = model.purchasePrice ?? model.askingPrice

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Quick valuation</CardTitle>
                    </div>
                    <Badge variant="outline">Back-of-napkin</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-3">
                    {methods.map(m => {
                        const pricePosition = price ? ((price - m.low) / (m.high - m.low)) * 100 : null
                        return (
                            <div key={m.name}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-foreground">{m.name}</span>
                                    <span className="text-[10px] text-muted-foreground">{m.basis}</span>
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground w-14 text-right">{money(m.low)}</span>
                                    <div className="relative flex-1 h-3 rounded-full bg-gradient-to-r from-green-200 via-amber-200 to-red-200 dark:from-green-900 dark:via-amber-900 dark:to-red-900">
                                        <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/30" />
                                        {pricePosition !== null && pricePosition >= 0 && pricePosition <= 100 && (
                                            <div
                                                className="absolute top-1/2 -translate-y-1/2 h-4 w-1 rounded-sm bg-foreground shadow-sm"
                                                style={{ left: `${Math.min(Math.max(pricePosition, 2), 98)}%` }}
                                                title={`Asking price: ${money(price!)}`}
                                            />
                                        )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground w-14">{money(m.high)}</span>
                                </div>
                                <div className="flex justify-center">
                                    <span className="text-[10px] font-medium text-foreground">{money(m.mid)}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
                {price && (
                    <div className="mt-3 rounded-md border border-dashed border-border bg-muted/20 p-2">
                        <p className="text-[11px] text-muted-foreground">
                            <strong>Price marker (▊)</strong> shows where the {model.purchasePrice ? 'purchase' : 'asking'} price ({money(price)}) falls in each range.
                            Left of center = potentially undervalued. Right = potentially overvalued.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
