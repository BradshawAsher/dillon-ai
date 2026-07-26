import { useMemo } from 'react'
import { ClipboardCheck, CheckSquare, Square } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    documents: SubmissionHistoryItem[]
}

type ChecklistItem = {
    label: string
    done: boolean
    category: 'financial' | 'legal' | 'operational' | 'deal'
}

export default function ClosingChecklistCard({ model, synthesis, documents }: Props) {
    const items = useMemo(() => {
        const checklist: ChecklistItem[] = []
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const completedDocs = documents.filter(d => d.status === 'completed')
        const hasRevenue = facts.revenue?.value != null
        const hasEbitda = facts.ebitda_sde?.value != null
        const hasPrice = model.purchasePrice != null

        checklist.push({ label: 'Revenue verified from source documents', done: hasRevenue && facts.revenue?.status === 'confirmed', category: 'financial' })
        checklist.push({ label: 'EBITDA/SDE confirmed and add-backs reviewed', done: hasEbitda && facts.ebitda_sde?.status === 'confirmed', category: 'financial' })
        checklist.push({ label: 'Purchase price agreed', done: hasPrice, category: 'deal' })
        checklist.push({ label: '3+ years of financials reviewed', done: completedDocs.length >= 3, category: 'financial' })
        checklist.push({ label: 'Tax returns cross-referenced', done: completedDocs.some(d => d.detectedDocumentType?.toLowerCase().includes('tax')), category: 'financial' })
        checklist.push({ label: 'Customer concentration assessed', done: synthesis?.redFlags?.some(f => /customer|concentration/i.test(f)) || synthesis?.greenFlags?.some(f => /customer|diversif/i.test(f)) || false, category: 'operational' })
        checklist.push({ label: 'All red flags investigated', done: !!synthesis && synthesis.redFlags.length === 0, category: 'operational' })
        checklist.push({ label: 'Valuation range established', done: !!synthesis?.valuationBaseEstimate && synthesis.valuationBaseEstimate !== '0', category: 'deal' })
        checklist.push({ label: 'Financing terms set', done: model.equityContributionPercent != null && model.interestRate != null, category: 'deal' })
        checklist.push({ label: 'Legal review completed', done: completedDocs.some(d => d.detectedDocumentType?.toLowerCase().includes('legal')), category: 'legal' })
        checklist.push({ label: 'Working capital requirement defined', done: model.workingCapitalRequirement != null && model.workingCapitalRequirement > 0, category: 'deal' })
        checklist.push({ label: 'Transition plan discussed', done: false, category: 'operational' })

        return checklist
    }, [model, synthesis, documents])

    const doneCount = items.filter(i => i.done).length
    const pct = Math.round((doneCount / items.length) * 100)

    const categories = ['financial', 'operational', 'deal', 'legal'] as const
    const categoryLabels = { financial: 'Financial', operational: 'Operational', deal: 'Deal terms', legal: 'Legal' }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Closing checklist</CardTitle>
                    </div>
                    <Badge variant={pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'secondary'}>
                        {pct}% ready
                    </Badge>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                    <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-4">
                    {categories.map(cat => {
                        const catItems = items.filter(i => i.category === cat)
                        if (catItems.length === 0) return null
                        return (
                            <div key={cat}>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{categoryLabels[cat]}</p>
                                <div className="space-y-1.5">
                                    {catItems.map((item, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            {item.done ? (
                                                <CheckSquare className="h-4 w-4 shrink-0 text-green-600" />
                                            ) : (
                                                <Square className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                                            )}
                                            <span className={`text-sm ${item.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                                {item.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
