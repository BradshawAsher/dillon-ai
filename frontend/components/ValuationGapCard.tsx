import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
}

export default function ValuationGapCard({ model, synthesis }: Props) {
    const data = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice
        if (!price || !ebitda) return null

        const fairValueEbitda = ebitda * 4.0
        const fairValueRevenue = revenue ? revenue * 1.0 : null
        const synthValuation = synthesis?.valuationBaseEstimate ? parseFloat(synthesis.valuationBaseEstimate) : null
        const fairValue = synthValuation && synthValuation > 0 ? synthValuation : fairValueEbitda

        const gap = price - fairValue
        const gapPercent = (gap / fairValue) * 100

        const productivityGain = ebitda * 0.15
        const marginImprovement = revenue ? revenue * 0.03 : ebitda * 0.1
        const totalPotentialValue = fairValue + productivityGain + marginImprovement

        return {
            askingPrice: price,
            fairValue,
            gap,
            gapPercent,
            productivityGain,
            marginImprovement,
            totalPotentialValue,
            fairValueRevenue,
        }
    }, [model, synthesis])

    if (!data) return null

    const maxValue = Math.max(data.askingPrice, data.totalPotentialValue) * 1.1
    const askingWidth = (data.askingPrice / maxValue) * 100
    const fairWidth = (data.fairValue / maxValue) * 100
    const potentialWidth = (data.totalPotentialValue / maxValue) * 100

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <CardTitle className="text-lg">Valuation gap analysis</CardTitle>
                    </div>
                    <CardInfoPopover cardId="valuation-gap" />
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="space-y-3">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-foreground">Asking Price</span>
                            <span className="text-xs font-semibold text-foreground">${data.askingPrice.toLocaleString()}</span>
                        </div>
                        <div className="h-5 w-full rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-orange-500" style={{ width: `${askingWidth}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-foreground">Fair Value Estimate</span>
                            <span className="text-xs font-semibold text-foreground">${data.fairValue.toLocaleString()}</span>
                        </div>
                        <div className="h-5 w-full rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${fairWidth}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-foreground">Total Potential Value</span>
                            <span className="text-xs font-semibold text-foreground">${data.totalPotentialValue.toLocaleString()}</span>
                        </div>
                        <div className="h-5 w-full rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${potentialWidth}%` }} />
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Valuation Gap</span>
                        <span className={`text-sm font-bold ${data.gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {data.gap > 0 ? '+' : ''}{data.gapPercent.toFixed(1)}% ({data.gap > 0 ? 'overpriced' : 'underpriced'})
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Productivity Gains (est.)</span>
                        <span className="text-xs font-medium text-foreground">+${data.productivityGain.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Margin Improvement (est.)</span>
                        <span className="text-xs font-medium text-foreground">+${data.marginImprovement.toLocaleString()}</span>
                    </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">
                        <strong>Value creation strategy:</strong>{' '}
                        {data.gap > 0
                            ? `Asking price exceeds fair value by ${Math.abs(data.gapPercent).toFixed(0)}%. Negotiate using identified operational improvements to justify a lower price or earn-out structure.`
                            : `Deal is priced ${Math.abs(data.gapPercent).toFixed(0)}% below fair value — potentially underpriced. Operational improvements could create additional ${((data.totalPotentialValue / data.askingPrice - 1) * 100).toFixed(0)}% upside.`
                        }
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
