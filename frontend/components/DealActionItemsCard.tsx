import { useMemo } from 'react'
import { CheckCircle2, Circle, Zap } from 'lucide-react'

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

type ActionItem = {
    text: string
    priority: 'high' | 'medium' | 'low'
    done: boolean
}

export default function DealActionItemsCard({ model, synthesis, documents }: Props) {
    const actions = useMemo(() => {
        const items: ActionItem[] = []
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const completedDocs = documents.filter(d => d.status === 'completed')

        if (completedDocs.length === 0) {
            items.push({ text: 'Upload your first financial document to start analysis', priority: 'high', done: false })
        } else {
            items.push({ text: 'Upload financial documents', priority: 'high', done: true })
        }

        const hasRevenue = facts.revenue?.value != null
        const hasEbitda = facts.ebitda_sde?.value != null
        const hasPrice = model.purchasePrice != null || model.askingPrice != null

        if (!hasRevenue) {
            items.push({ text: 'Confirm annual revenue — upload P&L or enter manually', priority: 'high', done: false })
        }
        if (!hasEbitda) {
            items.push({ text: 'Confirm EBITDA/SDE — needed for valuation multiple', priority: 'high', done: false })
        }
        if (!hasPrice) {
            items.push({ text: 'Set asking or purchase price in Deal Model', priority: 'high', done: false })
        }

        if (hasRevenue && hasEbitda && hasPrice) {
            items.push({ text: 'Core financial data confirmed', priority: 'high', done: true })
        }

        if (!synthesis) {
            if (completedDocs.length > 0) {
                items.push({ text: 'Wait for project synthesis to complete', priority: 'medium', done: false })
            }
        } else {
            items.push({ text: 'Project synthesis completed', priority: 'medium', done: true })

            if (synthesis.redFlags.length > 0) {
                items.push({ text: `Investigate ${synthesis.redFlags.length} red flag${synthesis.redFlags.length > 1 ? 's' : ''} with management`, priority: 'high', done: false })
            }

            if (synthesis.openQuestions?.length) {
                items.push({ text: `Resolve ${synthesis.openQuestions.length} open question${synthesis.openQuestions.length > 1 ? 's' : ''}`, priority: 'medium', done: false })
            }

            if (synthesis.missingDocuments?.length) {
                items.push({ text: `Request ${synthesis.missingDocuments.length} missing document${synthesis.missingDocuments.length > 1 ? 's' : ''} from seller`, priority: 'medium', done: false })
            }
        }

        if (!model.holdPeriodYears || !model.exitMultiple) {
            items.push({ text: 'Set hold period and exit multiple for returns modeling', priority: 'low', done: false })
        }

        if (!model.equityContributionPercent && !model.interestRate) {
            items.push({ text: 'Configure financing terms for leveraged analysis', priority: 'low', done: false })
        }

        return items.slice(0, 7)
    }, [model, synthesis, documents])

    const doneCount = actions.filter(a => a.done).length
    const totalCount = actions.length

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Next actions</CardTitle>
                    </div>
                    <Badge variant="secondary">{doneCount}/{totalCount}</Badge>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                    <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-border">
                    {actions.map((action, i) => (
                        <div key={i} className={`flex items-start gap-3 px-4 py-2.5 ${action.done ? 'opacity-60' : ''}`}>
                            {action.done ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                            ) : (
                                <Circle className={`mt-0.5 h-4 w-4 shrink-0 ${action.priority === 'high' ? 'text-red-500' : action.priority === 'medium' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                            )}
                            <span className={`text-sm ${action.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                {action.text}
                            </span>
                            {!action.done && action.priority === 'high' && (
                                <Badge variant="destructive" className="ml-auto shrink-0 text-[9px]">Priority</Badge>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
