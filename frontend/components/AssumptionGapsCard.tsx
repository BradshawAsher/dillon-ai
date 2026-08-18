import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model: DealModel
}

type Gap = {
    field: string
    documented: string
    assumed: string
    pctDiff: number
}

function money(v: number) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
    return `$${v.toFixed(0)}`
}

export default function AssumptionGapsCard({ model }: Props) {
    const gaps = useMemo(() => {
        const results: Gap[] = []
        const facts = parseDocumentedFacts(model.documentedFactsJson)

        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null

        if (revenue && model.baseRevenueGrowth != null && ebitda && model.baseEbitdaMargin != null) {
            const impliedMargin = ebitda / revenue
            const modelMargin = model.baseEbitdaMargin
            const diff = Math.abs(impliedMargin - modelMargin) / impliedMargin
            if (diff > 0.15) {
                results.push({
                    field: 'EBITDA Margin',
                    documented: `${(impliedMargin * 100).toFixed(0)}% (from docs)`,
                    assumed: `${(modelMargin * 100).toFixed(0)}% (model input)`,
                    pctDiff: diff * 100,
                })
            }
        }

        if (model.askingPrice && model.purchasePrice && model.askingPrice !== model.purchasePrice) {
            const diff = (model.askingPrice - model.purchasePrice) / model.askingPrice
            if (diff > 0.05) {
                results.push({
                    field: 'Price',
                    documented: `${money(model.askingPrice)} (asking)`,
                    assumed: `${money(model.purchasePrice)} (purchase)`,
                    pctDiff: diff * 100,
                })
            }
        }

        if (ebitda && model.exitMultiple && model.purchasePrice) {
            const entryMult = model.purchasePrice / ebitda
            if (model.exitMultiple < entryMult * 0.8) {
                results.push({
                    field: 'Multiple expansion',
                    documented: `${entryMult.toFixed(1)}x entry`,
                    assumed: `${model.exitMultiple.toFixed(1)}x exit (compression)`,
                    pctDiff: ((entryMult - model.exitMultiple) / entryMult) * 100,
                })
            } else if (model.exitMultiple > entryMult * 1.3) {
                results.push({
                    field: 'Multiple expansion',
                    documented: `${entryMult.toFixed(1)}x entry`,
                    assumed: `${model.exitMultiple.toFixed(1)}x exit (expansion)`,
                    pctDiff: ((model.exitMultiple - entryMult) / entryMult) * 100,
                })
            }
        }

        return results
    }, [model])

    if (gaps.length === 0) return null

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <CardTitle className="text-lg">Assumption gaps</CardTitle>
                        <CardInfoPopover cardId="assumption-gaps" />
                    </div>
                    <Badge variant="warning">{gaps.length} divergence{gaps.length > 1 ? 's' : ''}</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-3">These model assumptions differ significantly from documented data. Review to ensure the model reflects your best estimates.</p>
                <div className="space-y-3">
                    {gaps.map((gap, i) => (
                        <div key={i} className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">{gap.field}</span>
                                <Badge variant="outline" className="text-[10px]">{gap.pctDiff.toFixed(0)}% difference</Badge>
                            </div>
                            <div className="mt-1.5 grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-muted-foreground">Documented: </span>
                                    <span className="font-medium text-foreground">{gap.documented}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Model: </span>
                                    <span className="font-medium text-foreground">{gap.assumed}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
