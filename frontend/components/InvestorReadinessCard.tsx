import { useMemo } from 'react'
import { Briefcase } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem | null
    documentCount: number
}

type Criterion = {
    label: string
    met: boolean
    detail: string
}

export default function InvestorReadinessCard({ model, synthesis, documentCount }: Props) {
    const data = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price) return null

        const criteria: Criterion[] = []

        criteria.push({
            label: 'Financial statements uploaded',
            met: documentCount >= 2,
            detail: documentCount >= 2 ? `${documentCount} documents analyzed` : 'Need at least 2 financial documents',
        })

        criteria.push({
            label: 'Revenue verified',
            met: revenue != null && revenue > 0,
            detail: revenue ? `$${revenue.toLocaleString()} confirmed` : 'Revenue not yet confirmed from documents',
        })

        criteria.push({
            label: 'EBITDA/SDE verified',
            met: ebitda != null && ebitda > 0,
            detail: ebitda ? `$${ebitda.toLocaleString()} confirmed` : 'EBITDA not yet confirmed from documents',
        })

        criteria.push({
            label: 'Synthesis complete',
            met: synthesis != null,
            detail: synthesis ? 'AI synthesis available with risk assessment' : 'Need document synthesis for risk view',
        })

        criteria.push({
            label: 'Purchase price established',
            met: price > 0,
            detail: `$${price.toLocaleString()}`,
        })

        criteria.push({
            label: 'Financing structure defined',
            met: (model.seniorDebtAmount ?? 0) > 0 || (model.equityAmount ?? 0) > 0,
            detail: (model.seniorDebtAmount ?? 0) > 0 ? `$${(model.seniorDebtAmount ?? 0).toLocaleString()} debt + $${(model.equityAmount ?? 0).toLocaleString()} equity` : 'Define sources and uses',
        })

        criteria.push({
            label: 'Risk factors documented',
            met: (synthesis?.redFlags?.length ?? 0) + (synthesis?.yellowFlags?.length ?? 0) > 0,
            detail: synthesis ? `${synthesis.redFlags.length} red, ${synthesis.yellowFlags.length} yellow flags identified` : 'Need risk assessment from synthesis',
        })

        criteria.push({
            label: 'Growth assumptions set',
            met: model.baseRevenueGrowth != null && model.exitMultiple != null,
            detail: model.baseRevenueGrowth != null ? `${((model.baseRevenueGrowth ?? 0) * 100).toFixed(0)}% growth, ${model.exitMultiple}x exit` : 'Define growth and exit assumptions',
        })

        const metCount = criteria.filter(c => c.met).length
        return { criteria, metCount, total: criteria.length }
    }, [model, synthesis, documentCount])

    if (!data) return null

    const pct = Math.round((data.metCount / data.total) * 100)
    const ready = pct >= 75
    const statusLabel = pct >= 87 ? 'Ready to present' : pct >= 62 ? 'Almost ready' : pct >= 37 ? 'In progress' : 'Early stage'
    const statusColor = pct >= 87 ? 'text-green-600' : pct >= 62 ? 'text-blue-600' : pct >= 37 ? 'text-amber-600' : 'text-red-600'
    const barColor = pct >= 87 ? 'bg-green-500' : pct >= 62 ? 'bg-blue-500' : pct >= 37 ? 'bg-amber-500' : 'bg-red-500'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Investor/lender readiness</CardTitle>
                    <CardInfoPopover cardId="investor-readiness" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Is the deal package ready to present to investors or lenders?
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-bold ${statusColor}`}>{statusLabel}</span>
                            <span className="text-xs font-mono text-muted-foreground">{data.metCount}/{data.total}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    {data.criteria.map((c, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <span className={`mt-0.5 text-xs ${c.met ? 'text-green-600' : 'text-muted-foreground/40'}`}>
                                {c.met ? '✓' : '○'}
                            </span>
                            <div className="flex-1">
                                <p className={`text-xs ${c.met ? 'text-foreground' : 'text-muted-foreground'}`}>{c.label}</p>
                                <p className="text-[10px] text-muted-foreground">{c.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {ready && (
                    <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-2.5 text-[10px] text-green-700 dark:text-green-400">
                        Deal package has sufficient data for investor/lender presentation. Consider exporting the deal summary for distribution.
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
