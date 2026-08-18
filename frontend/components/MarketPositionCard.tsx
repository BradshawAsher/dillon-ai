import { useMemo } from 'react'
import { MapPin } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model: DealModel
}

type Dimension = {
    label: string
    value: string
    position: number // 0-3 index indicating which tier is active
    tiers: string[]
}

type MarketAnalysis = {
    dimensions: Dimension[]
    summary: string
}

export default function MarketPositionCard({ model }: Props) {
    const analysis = useMemo((): MarketAnalysis | null => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda || ebitda <= 0) return null

        const margin = revenue && revenue > 0 ? ebitda / revenue : (model.baseEbitdaMargin ?? 0.20)
        const growth = model.baseRevenueGrowth ?? 0.05
        const multiple = price / ebitda

        const dimensions: Dimension[] = []

        // Size classification based on revenue
        let sizeLabel: string
        let sizePosition: number
        if (revenue) {
            if (revenue < 500_000) { sizeLabel = 'Micro'; sizePosition = 0 }
            else if (revenue < 2_000_000) { sizeLabel = 'Small'; sizePosition = 1 }
            else if (revenue < 10_000_000) { sizeLabel = 'Mid'; sizePosition = 2 }
            else { sizeLabel = 'Large'; sizePosition = 3 }
        } else {
            // Estimate from EBITDA and margin
            const estRevenue = ebitda / margin
            if (estRevenue < 500_000) { sizeLabel = 'Micro'; sizePosition = 0 }
            else if (estRevenue < 2_000_000) { sizeLabel = 'Small'; sizePosition = 1 }
            else if (estRevenue < 10_000_000) { sizeLabel = 'Mid'; sizePosition = 2 }
            else { sizeLabel = 'Large'; sizePosition = 3 }
        }
        dimensions.push({
            label: 'Size',
            value: sizeLabel,
            position: sizePosition,
            tiers: ['Micro', 'Small', 'Mid', 'Large'],
        })

        // Profitability tier
        let profitLabel: string
        let profitPosition: number
        if (margin > 0.25) { profitLabel = 'Premium'; profitPosition = 2 }
        else if (margin >= 0.15) { profitLabel = 'Standard'; profitPosition = 1 }
        else { profitLabel = 'Low'; profitPosition = 0 }
        dimensions.push({
            label: 'Profitability',
            value: `${profitLabel} (${(margin * 100).toFixed(0)}%)`,
            position: profitPosition,
            tiers: ['Low', 'Standard', 'Premium'],
        })

        // Growth profile
        let growthLabel: string
        let growthPosition: number
        if (growth < 0) { growthLabel = 'Declining'; growthPosition = 0 }
        else if (growth < 0.05) { growthLabel = 'Stable'; growthPosition = 1 }
        else if (growth <= 0.10) { growthLabel = 'Moderate'; growthPosition = 2 }
        else { growthLabel = 'High growth'; growthPosition = 3 }
        dimensions.push({
            label: 'Growth',
            value: `${growthLabel} (${(growth * 100).toFixed(0)}%)`,
            position: growthPosition,
            tiers: ['Declining', 'Stable', 'Moderate', 'High'],
        })

        // Pricing tier
        let pricingLabel: string
        let pricingPosition: number
        if (multiple < 3) { pricingLabel = 'Discount'; pricingPosition = 0 }
        else if (multiple <= 5) { pricingLabel = 'Fair'; pricingPosition = 1 }
        else if (multiple <= 7) { pricingLabel = 'Premium'; pricingPosition = 2 }
        else { pricingLabel = 'Expensive'; pricingPosition = 3 }
        dimensions.push({
            label: 'Pricing',
            value: `${pricingLabel} (${multiple.toFixed(1)}x)`,
            position: pricingPosition,
            tiers: ['Discount', 'Fair', 'Premium', 'Expensive'],
        })

        // Build summary sentence
        const summaryParts: string[] = []
        summaryParts.push(`This is a ${sizeLabel.toLowerCase()}-sized business`)
        summaryParts.push(`with ${profitLabel.toLowerCase()} profitability`)
        summaryParts.push(`${growthLabel.toLowerCase()} growth trajectory`)
        summaryParts.push(`priced at a ${pricingLabel.toLowerCase()} valuation.`)

        const summary = summaryParts.join(', ').replace(', priced', ', and priced')

        return { dimensions, summary }
    }, [model])

    if (!analysis) return null

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <CardTitle className="text-lg">Market position</CardTitle>
                    </div>
                    <CardInfoPopover cardId="market-position" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Market position indicators
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {analysis.dimensions.map(dim => (
                    <div key={dim.label} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">{dim.label}</span>
                            <span className="text-[10px] text-muted-foreground">{dim.value}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {dim.tiers.map((tier, i) => (
                                <div key={tier} className="flex flex-1 flex-col items-center gap-1">
                                    <div
                                        className={`h-3 w-3 rounded-full border-2 transition-colors ${
                                            i === dim.position
                                                ? 'border-primary bg-primary'
                                                : i < dim.position
                                                    ? 'border-primary/40 bg-primary/20'
                                                    : 'border-muted-foreground/30 bg-transparent'
                                        }`}
                                    />
                                    <span className={`text-[9px] ${i === dim.position ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                                        {tier}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Summary */}
                <div className="rounded-lg bg-muted/50 p-3 mt-2">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Market Position</p>
                    <p className="text-[11px] text-foreground">{analysis.summary}</p>
                </div>
            </CardContent>
        </Card>
    )
}
