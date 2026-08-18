import { useMemo } from 'react'
import { Activity } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model: DealModel
}

type SensitivityItem = {
    label: string
    change: string
    impactPositive: number
    impactNegative: number
}

export default function GrowthSensitivityCard({ model }: Props) {
    const items = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda) return null

        const holdYears = model.holdPeriodYears ?? 5
        const baseGrowth = model.baseRevenueGrowth ?? 0.05
        const baseMargin = model.baseEbitdaMargin ?? (revenue && ebitda ? ebitda / revenue : 0.20)
        const exitMult = model.exitMultiple ?? 4.0

        const baseRevenue = (revenue ?? ebitda / baseMargin)
        const futureRevenueBase = baseRevenue * Math.pow(1 + baseGrowth, holdYears)
        const baseValue = futureRevenueBase * baseMargin * exitMult

        const revenueUp = baseRevenue * Math.pow(1 + baseGrowth + 0.05, holdYears) * baseMargin * exitMult
        const revenueDown = baseRevenue * Math.pow(1 + baseGrowth - 0.05, holdYears) * baseMargin * exitMult

        const marginUp = futureRevenueBase * (baseMargin + 0.02) * exitMult
        const marginDown = futureRevenueBase * (baseMargin - 0.02) * exitMult

        const multUp = futureRevenueBase * baseMargin * (exitMult + 1)
        const multDown = futureRevenueBase * baseMargin * (exitMult - 1)

        const result: SensitivityItem[] = [
            {
                label: 'Revenue Growth',
                change: '±5%',
                impactPositive: revenueUp - baseValue,
                impactNegative: revenueDown - baseValue,
            },
            {
                label: 'EBITDA Margin',
                change: '±2%',
                impactPositive: marginUp - baseValue,
                impactNegative: marginDown - baseValue,
            },
            {
                label: 'Exit Multiple',
                change: '±1.0x',
                impactPositive: multUp - baseValue,
                impactNegative: multDown - baseValue,
            },
        ]

        return { items: result, baseValue }
    }, [model])

    if (!items) return null

    const maxImpact = Math.max(...items.items.map(i => Math.max(Math.abs(i.impactPositive), Math.abs(i.impactNegative))))

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Growth sensitivity analysis</CardTitle>
                    <CardInfoPopover cardId="growth-sensitivity" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Impact on {model.holdPeriodYears ?? 5}-year business value from various changes
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="text-center mb-2">
                    <span className="text-xs text-muted-foreground">Base case value: </span>
                    <span className="text-sm font-bold text-foreground">${Math.round(items.baseValue).toLocaleString()}</span>
                </div>

                {items.items.map((item, i) => (
                    <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">{item.label}</span>
                            <span className="text-[10px] text-muted-foreground">{item.change}</span>
                        </div>
                        <div className="flex items-center gap-1 h-6">
                            <div className="flex-1 flex justify-end">
                                <div
                                    className="h-5 rounded-l-sm bg-red-400"
                                    style={{ width: `${(Math.abs(item.impactNegative) / maxImpact) * 100}%` }}
                                    title={`-$${Math.abs(Math.round(item.impactNegative)).toLocaleString()}`}
                                />
                            </div>
                            <div className="w-px h-full bg-border shrink-0" />
                            <div className="flex-1">
                                <div
                                    className="h-5 rounded-r-sm bg-green-400"
                                    style={{ width: `${(Math.abs(item.impactPositive) / maxImpact) * 100}%` }}
                                    title={`+$${Math.round(item.impactPositive).toLocaleString()}`}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="text-red-600">-${Math.abs(Math.round(item.impactNegative)).toLocaleString()}</span>
                            <span className="text-green-600">+${Math.round(item.impactPositive).toLocaleString()}</span>
                        </div>
                    </div>
                ))}

                <div className="rounded-lg bg-muted/50 p-3 mt-2">
                    <p className="text-[10px] text-muted-foreground">
                        Tornado chart shows how sensitive the exit value is to changes in key assumptions.
                        Wider bars = more sensitivity. Focus negotiations on the most impactful levers.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
