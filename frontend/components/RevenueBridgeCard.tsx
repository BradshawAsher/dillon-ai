import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'
import DataOriginBadge, { type DataOrigin } from './common/DataOriginBadge'

type Props = {
    model: DealModel
}

type BridgeItem = {
    label: string
    value: number
    color: string
    isTotal?: boolean
    origin: DataOrigin
    originLabel?: string
    formula?: string
}

export default function RevenueBridgeCard({ model }: Props) {
    const items = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        if (!revenue) return null

        const growthRate = model.baseRevenueGrowth ?? 0.05
        const holdYears = model.holdPeriodYears ?? 5

        const volumeGrowth = revenue * growthRate * holdYears * 0.6
        const priceIncreases = revenue * growthRate * holdYears * 0.3
        const newProducts = revenue * growthRate * holdYears * 0.1
        const futureRevenue = revenue + volumeGrowth + priceIncreases + newProducts

        const result: BridgeItem[] = [
            { label: 'Current Revenue', value: revenue, color: 'bg-blue-500', isTotal: true, origin: 'extracted', originLabel: 'Extracted (Reported LTM)' },
            { label: 'Volume Growth', value: volumeGrowth, color: 'bg-emerald-500', origin: 'assumption', originLabel: 'Assumption (60% Volume)', formula: 'Revenue × Growth × Years × 60%' },
            { label: 'Price Increases', value: priceIncreases, color: 'bg-amber-500', origin: 'assumption', originLabel: 'Assumption (30% Price)', formula: 'Revenue × Growth × Years × 30%' },
            { label: 'New Products/Services', value: newProducts, color: 'bg-violet-500', origin: 'assumption', originLabel: 'Assumption (10% New Stream)', formula: 'Revenue × Growth × Years × 10%' },
            { label: `${holdYears}-Year Revenue`, value: futureRevenue, color: 'bg-blue-600', isTotal: true, origin: 'calculated', originLabel: 'Calculated (Projected)', formula: 'Base + Volume + Price + New Products' },
        ]

        return result
    }, [model])

    if (!items) return null

    const maxValue = Math.max(...items.map(i => i.value))

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <CardTitle className="text-lg">Revenue bridge</CardTitle>
                        <CardInfoPopover cardId="revenue-bridge" />
                    </div>
                    <DataOriginBadge
                        origin="assumption"
                        label="Assumption (Growth Attribution)"
                        description="Illustrative underwriting attribution decomposing revenue growth into volume, pricing, and new product assumptions."
                    />
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {items.map((item, i) => (
                    <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                                <span className={`text-xs ${item.isTotal ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                                    {item.label}
                                </span>
                                <DataOriginBadge
                                    origin={item.origin}
                                    label={item.originLabel}
                                    formula={item.formula}
                                    compact
                                />
                            </div>
                            <span className={`text-xs ${item.isTotal ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
                                {item.isTotal ? '' : '+'}{item.isTotal ? '$' : '$'}{Math.round(item.value).toLocaleString()}
                            </span>
                        </div>
                        <div className="h-5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                                className={`h-full rounded-full ${item.color} transition-all`}
                                style={{ width: `${(item.value / maxValue) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}

                <div className="rounded-lg bg-muted/50 p-3 mt-2">
                    <p className="text-[10px] text-muted-foreground">
                        Revenue growth decomposition assumes {((model.baseRevenueGrowth ?? 0.05) * 100).toFixed(0)}% annual growth split across volume (60%), pricing (30%), and new revenue streams (10%) over {model.holdPeriodYears ?? 5} years.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
