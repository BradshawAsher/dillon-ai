import { CheckCircle2, Circle } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Card, CardContent } from '../lib/shadcn/card'
import { parseDocumentedFacts } from '../utils/evidence'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    documentsCount: number
    completedDocuments: number
}

type Milestone = {
    label: string
    done: boolean
}

export default function DealReadinessGauge({ model, synthesis, documentsCount, completedDocuments }: Props) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const hasRevenue = facts.revenue?.status === 'confirmed' && typeof facts.revenue?.value === 'number'
    const hasEbitda = facts.ebitda_sde?.status === 'confirmed' && typeof facts.ebitda_sde?.value === 'number'
    const hasPrice = model.askingPrice !== null || model.purchasePrice !== null
    const hasSynthesis = !!synthesis
    const hasValuation = !!(synthesis?.valuationLowerBound || synthesis?.valuationUpperBound)
    const allDocsProcessed = documentsCount > 0 && completedDocuments >= documentsCount

    const milestones: Milestone[] = [
        { label: 'Documents uploaded', done: documentsCount > 0 },
        { label: 'All docs processed', done: allDocsProcessed },
        { label: 'Revenue confirmed', done: hasRevenue },
        { label: 'EBITDA/SDE confirmed', done: hasEbitda },
        { label: 'Asking price set', done: hasPrice },
        { label: 'Synthesis complete', done: hasSynthesis },
        { label: 'Valuation generated', done: hasValuation },
    ]

    const completedCount = milestones.filter(m => m.done).length
    const percentage = Math.round((completedCount / milestones.length) * 100)

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-foreground">Deal analysis readiness</p>
                        <p className="text-xs text-muted-foreground">{completedCount} of {milestones.length} milestones complete</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/20">
                        <span className="text-lg font-bold text-primary">{percentage}%</span>
                    </div>
                </div>
                <div className="mt-3 flex gap-1">
                    {milestones.map((m, i) => (
                        <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${m.done ? 'bg-primary' : 'bg-muted'}`}
                            title={m.label}
                        />
                    ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
                    {milestones.map((m, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            {m.done
                                ? <CheckCircle2 className="h-3 w-3 shrink-0 text-primary" />
                                : <Circle className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                            }
                            <span className={`text-[11px] leading-tight ${m.done ? 'text-foreground' : 'text-muted-foreground'}`}>{m.label}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
