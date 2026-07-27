import { useMemo } from 'react'
import { Scale } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

type ComparableTransaction = {
    name: string
    multiple: number
    impliedPrice: number
    premiumDiscount: number
}

function money(value: number) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
}

function getRevenueRangeLabel(revenue: number): string {
    if (revenue < 1_000_000) return '<$1M revenue'
    if (revenue < 5_000_000) return '$1-5M revenue'
    return '$5M+ revenue'
}

function getTypicalMultiples(revenue: number): { low: number; high: number } {
    if (revenue < 1_000_000) return { low: 2, high: 3 }
    if (revenue < 5_000_000) return { low: 3, high: 4 }
    return { low: 4, high: 6 }
}

export default function ComparableTransactionsCard({ model }: Props) {
    const analysis = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!ebitda || ebitda <= 0 || !price || price <= 0) return null

        const currentMultiple = price / ebitda
        const typicalRange = revenue ? getTypicalMultiples(revenue) : { low: 3, high: 5 }

        const comps: ComparableTransaction[] = [
            {
                name: 'Conservative SMB',
                multiple: typicalRange.low,
                impliedPrice: ebitda * typicalRange.low,
                premiumDiscount: ((price - ebitda * typicalRange.low) / (ebitda * typicalRange.low)) * 100,
            },
            {
                name: 'Market Standard',
                multiple: (typicalRange.low + typicalRange.high) / 2,
                impliedPrice: ebitda * ((typicalRange.low + typicalRange.high) / 2),
                premiumDiscount: ((price - ebitda * ((typicalRange.low + typicalRange.high) / 2)) / (ebitda * ((typicalRange.low + typicalRange.high) / 2))) * 100,
            },
            {
                name: 'Premium Quality',
                multiple: typicalRange.high,
                impliedPrice: ebitda * typicalRange.high,
                premiumDiscount: ((price - ebitda * typicalRange.high) / (ebitda * typicalRange.high)) * 100,
            },
            {
                name: 'Strategic Buyer',
                multiple: typicalRange.high + 1.5,
                impliedPrice: ebitda * (typicalRange.high + 1.5),
                premiumDiscount: ((price - ebitda * (typicalRange.high + 1.5)) / (ebitda * (typicalRange.high + 1.5))) * 100,
            },
        ]

        return {
            comps,
            currentMultiple,
            revenue,
            ebitda,
            price,
            rangeLabel: revenue ? getRevenueRangeLabel(revenue) : null,
            typicalRange,
        }
    }, [model])

    if (!analysis) return null

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Comparable transactions</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    What do similar deals look like?
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {/* Current deal position */}
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">This deal</span>
                        <span className="text-xs font-medium text-primary">
                            {analysis.currentMultiple.toFixed(1)}x EBITDA
                        </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                        {money(analysis.price)} price / {money(analysis.ebitda)} EBITDA
                    </div>
                </div>

                {/* Comparable transactions */}
                <div className="space-y-2">
                    {analysis.comps.map((comp) => {
                        const isAbove = comp.premiumDiscount > 0
                        return (
                            <div
                                key={comp.name}
                                className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                            >
                                <div>
                                    <div className="text-xs font-medium text-foreground">
                                        {comp.name}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                        {comp.multiple.toFixed(1)}x = {money(comp.impliedPrice)}
                                    </div>
                                </div>
                                <div
                                    className={`text-xs font-medium ${
                                        isAbove
                                            ? 'text-red-600'
                                            : 'text-green-600'
                                    }`}
                                >
                                    {isAbove ? '+' : ''}
                                    {comp.premiumDiscount.toFixed(1)}%
                                    <span className="text-[10px] text-muted-foreground ml-1">
                                        {isAbove ? 'premium' : 'discount'}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Typical SMB ranges reference */}
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="text-xs font-medium text-foreground mb-2">Typical SMB EBITDA multiple ranges</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded bg-muted/50 p-2">
                            <div className="text-[10px] text-muted-foreground">&lt;$1M rev</div>
                            <div className="text-sm font-semibold text-foreground">2-3x</div>
                        </div>
                        <div className="rounded bg-muted/50 p-2">
                            <div className="text-[10px] text-muted-foreground">$1-5M rev</div>
                            <div className="text-sm font-semibold text-foreground">3-4x</div>
                        </div>
                        <div className="rounded bg-muted/50 p-2">
                            <div className="text-[10px] text-muted-foreground">$5M+ rev</div>
                            <div className="text-sm font-semibold text-foreground">4-6x</div>
                        </div>
                    </div>
                    {analysis.rangeLabel && (
                        <p className="text-[10px] text-muted-foreground mt-2 text-center">
                            This business ({analysis.rangeLabel}) typically trades at {analysis.typicalRange.low}-{analysis.typicalRange.high}x EBITDA
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
