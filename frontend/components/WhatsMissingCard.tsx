import { useMemo } from 'react'
import { SearchX } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    documents: SubmissionHistoryItem[]
}

type MissingItem = {
    item: string
    impact: 'critical' | 'important' | 'nice-to-have'
    reason: string
}

export default function WhatsMissingCard({ model, synthesis, documents }: Props) {
    const missing = useMemo(() => {
        const items: MissingItem[] = []
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const completedDocs = documents.filter(d => d.status === 'completed')
        const docTypes = completedDocs.map(d => (d.detectedDocumentType ?? '').toLowerCase())

        if (typeof facts.revenue?.value !== 'number') {
            items.push({ item: 'Revenue figure', impact: 'critical', reason: 'Needed for valuation multiples and margin analysis' })
        }
        if (typeof facts.ebitda_sde?.value !== 'number') {
            items.push({ item: 'EBITDA or SDE', impact: 'critical', reason: 'Primary metric for entry multiple and payback calculations' })
        }
        if (!model.purchasePrice && !model.askingPrice) {
            items.push({ item: 'Asking/purchase price', impact: 'critical', reason: 'Cannot compute multiples, payback, or returns without a price' })
        }

        if (!docTypes.some(t => t.includes('tax'))) {
            items.push({ item: 'Tax returns (2-3 years)', impact: 'important', reason: 'Cross-references P&L figures and reveals unreported income' })
        }
        if (!docTypes.some(t => t.includes('balance') || t.includes('asset'))) {
            items.push({ item: 'Balance sheet', impact: 'important', reason: 'Shows assets, liabilities, and equity for leverage analysis' })
        }
        if (!docTypes.some(t => t.includes('customer') || t.includes('client'))) {
            items.push({ item: 'Customer revenue breakdown', impact: 'important', reason: 'Identifies concentration risk — the #1 deal-killer in SMBs' })
        }

        if (!model.holdPeriodYears) {
            items.push({ item: 'Target hold period', impact: 'nice-to-have', reason: 'Enables returns modeling and exit scenarios' })
        }
        if (!model.exitMultiple) {
            items.push({ item: 'Expected exit multiple', impact: 'nice-to-have', reason: 'Required for MOIC and IRR projections' })
        }

        if (synthesis?.missingDocuments?.length) {
            for (const doc of synthesis.missingDocuments.slice(0, 3)) {
                if (!items.some(i => i.item.toLowerCase().includes(doc.toLowerCase().slice(0, 15)))) {
                    items.push({ item: doc, impact: 'important', reason: 'Identified by AI synthesis as a gap' })
                }
            }
        }

        return items.slice(0, 8)
    }, [model, synthesis, documents])

    if (missing.length === 0) return null

    const impactColor = (i: MissingItem['impact']) =>
        i === 'critical' ? 'text-red-600 dark:text-red-400' :
        i === 'important' ? 'text-amber-600 dark:text-amber-400' :
        'text-muted-foreground'

    const criticalCount = missing.filter(m => m.impact === 'critical').length

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <SearchX className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">What's missing</CardTitle>
                        <CardInfoPopover cardId="whats-missing" />
                    </div>
                    {criticalCount > 0 && (
                        <Badge variant="destructive">{criticalCount} critical</Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-2.5">
                    {missing.map((item, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                            <span className={`mt-0.5 text-[10px] font-bold uppercase ${impactColor(item.impact)}`}>
                                {item.impact === 'critical' ? '!!!' : item.impact === 'important' ? '!!' : '!'}
                            </span>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">{item.item}</p>
                                <p className="text-[11px] text-muted-foreground">{item.reason}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
